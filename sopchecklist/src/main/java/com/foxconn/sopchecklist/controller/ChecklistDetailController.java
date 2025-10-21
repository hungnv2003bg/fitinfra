package com.foxconn.sopchecklist.controller;

import com.foxconn.sopchecklist.entity.ChecklistDetail;
import com.foxconn.sopchecklist.entity.ChecklistDetailFiles;
import com.foxconn.sopchecklist.entity.Checklists;
import com.foxconn.sopchecklist.entity.Improvements;
import com.foxconn.sopchecklist.repository.ChecklistDetailRepository;
import com.foxconn.sopchecklist.repository.ChecklistsRepository;
import com.foxconn.sopchecklist.repository.ImprovementsRepository;
import com.foxconn.sopchecklist.service.ChecklistDetailFileStorageService;
import com.foxconn.sopchecklist.service.TimeService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/checklist-details")
@CrossOrigin
public class ChecklistDetailController {

    private final ChecklistDetailRepository repository;
    private final ChecklistsRepository checklistsRepository;
    private final TimeService timeService;
    private final ImprovementsRepository improvementsRepository;
    
    
    @Autowired
    private ChecklistDetailFileStorageService fileStorageService;

    public ChecklistDetailController(ChecklistDetailRepository repository, ChecklistsRepository checklistsRepository, TimeService timeService, ImprovementsRepository improvementsRepository) {
        this.repository = repository;
        this.checklistsRepository = checklistsRepository;
        this.timeService = timeService;
        this.improvementsRepository = improvementsRepository;
    }

    @GetMapping
    public List<ChecklistDetail> findAll(@RequestParam(value = "parentId", required = false) Long parentId) {
        if (parentId != null) {
            return checklistsRepository.findById(parentId)
                    .map(repository::findByChecklist)
                    .orElseGet(List::of);
        }
        return repository.findAll();
    }

    @PostMapping("/create-improvements-for-existing")
    public ResponseEntity<Map<String, Object>> createImprovementsForExisting() {
        Map<String, Object> result = new java.util.HashMap<>();
        int createdCount = 0;
        
        try {
            // Tìm tất cả checklist details có abnormalInfo nhưng chưa có improvement
            List<ChecklistDetail> detailsWithAbnormalInfo = repository.findAll().stream()
                .filter(detail -> detail.getAbnormalInfo() != null && !detail.getAbnormalInfo().trim().isEmpty())
                .collect(java.util.stream.Collectors.toList());
            
            for (ChecklistDetail detail : detailsWithAbnormalInfo) {
                String checklistDetailId = String.valueOf(detail.getId());
                boolean existingImprovement = improvementsRepository.findFirstByChecklistDetailId(checklistDetailId).isPresent();
                
                if (!existingImprovement) {
                    createImprovementFromChecklistDetail(detail);
                    createdCount++;
                }
            }
            
            result.put("success", true);
            result.put("createdCount", createdCount);
            result.put("totalChecked", detailsWithAbnormalInfo.size());
            result.put("message", "Created " + createdCount + " improvement records for existing checklist details");
            
        } catch (Exception e) {
            result.put("success", false);
            result.put("error", e.getMessage());
        }
        
        return ResponseEntity.ok(result);
    }

    @GetMapping("/debug/status")
    public Map<String, Object> debugStatus() {
        Map<String, Object> result = new java.util.HashMap<>();
        
        List<Checklists> checklists = checklistsRepository.findAll();
        result.put("totalChecklists", checklists.size());
        
        Map<String, Long> statusCount = new java.util.HashMap<>();
        for (Checklists cl : checklists) {
            String status = cl.getStatus();
            statusCount.put(status, statusCount.getOrDefault(status, 0L) + 1);
        }
        result.put("statusCount", statusCount);
        
        List<Map<String, Object>> checklistDetails = new java.util.ArrayList<>();
        for (Checklists cl : checklists) {
            List<ChecklistDetail> details = repository.findByChecklist(cl);
            if (!details.isEmpty()) {
                Map<String, Object> info = new java.util.HashMap<>();
                info.put("checklistId", cl.getId());
                info.put("taskName", cl.getTaskName());
                info.put("status", cl.getStatus());
                info.put("detailCount", details.size());
                checklistDetails.add(info);
            }
        }
        result.put("checklistsWithDetails", checklistDetails);
        
        return result;
    }

    @GetMapping("/by-checklist/{checklistId}")
    public ResponseEntity<List<ChecklistDetail>> findByChecklist(@PathVariable Long checklistId) {
        return checklistsRepository.findById(checklistId)
                .map(repository::findByChecklist)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @GetMapping("/{id}")
    public ResponseEntity<ChecklistDetail> findOne(@PathVariable Long id) {
        return repository.findById(id).map(ResponseEntity::ok).orElse(ResponseEntity.notFound().build());
    }

    @PatchMapping("/{id}")
    @Transactional
    public ResponseEntity<ChecklistDetail> updateFields(@PathVariable Long id, @RequestBody Map<String, Object> updates) {
        return repository.findById(id).map(existed -> {
            // Update basic fields
            if (updates.containsKey("status")) {
                String newStatus = (String) updates.get("status");
                existed.setStatus(newStatus);
                // If status is COMPLETED, ensure lastEditedAt is set for completion date
                if ("COMPLETED".equals(newStatus) || "DONE".equals(newStatus)) {
                    existed.setLastEditedAt(timeService.nowVietnam());
                }
            }
            if (updates.containsKey("uploadFile")) existed.setUploadFile((String) updates.get("uploadFile"));
            if (updates.containsKey("note")) existed.setNote((String) updates.get("note"));
            if (updates.containsKey("abnormalInfo")) {
                String newAbnormalInfo = (String) updates.get("abnormalInfo");
                existed.setAbnormalInfo(newAbnormalInfo);

                // Cập nhật improvement dựa trên nội dung abnormalInfo
                String checklistDetailId = String.valueOf(existed.getId());
                
                // Tìm improvement hiện có cho checklist detail này
                Improvements existingImprovement = improvementsRepository
                        .findFirstByChecklistDetailId(checklistDetailId)
                        .orElse(null);

                // Fallback: Nếu không tìm thấy theo checklistDetailId (do bản ghi cũ chưa có),
                // tìm bản ghi improvement mới nhất theo cùng checklist và cùng tên công việc (taskName)
                if (existingImprovement == null && existed.getChecklist() != null) {
                    existingImprovement = improvementsRepository
                            .findFirstByChecklist_IdAndCategoryOrderByCreatedAtDesc(existed.getChecklist().getId(), existed.getTaskName())
                            .orElse(null);
                }
                
                if (existingImprovement != null) {
                    // Cập nhật improvement hiện có
                    if (newAbnormalInfo != null && !newAbnormalInfo.trim().isEmpty()) {
                        // Có nội dung: cập nhật issueDescription
                        existingImprovement.setIssueDescription(newAbnormalInfo);
                        improvementsRepository.save(existingImprovement);
                    }
                    // Không có nội dung: giữ nguyên issueDescription hiện tại (không cập nhật)
                } else if (newAbnormalInfo != null && !newAbnormalInfo.trim().isEmpty()) {
                    // Chưa có improvement và có nội dung: tạo mới
                    createImprovementFromChecklistDetail(existed);
                }
            }
            if (updates.containsKey("lastEditedBy")) {
                Object lastEditedBy = updates.get("lastEditedBy");
                if (lastEditedBy instanceof Number) {
                    existed.setLastEditedBy(((Number) lastEditedBy).longValue());
                }
            }
            existed.setLastEditedAt(timeService.nowVietnam());
            
            // Update files if provided
            if (updates.containsKey("files")) {
                @SuppressWarnings("unchecked")
                List<Map<String, Object>> filesData = (List<Map<String, Object>>) updates.get("files");
                updateWithFiles(existed, filesData);
            }
            
            ChecklistDetail saved = repository.save(existed);
            return ResponseEntity.ok(saved);
        }).orElse(ResponseEntity.notFound().build());
    }
    
    private void updateWithFiles(ChecklistDetail checklistDetail, List<Map<String, Object>> filesData) {
        try {
            // Get existing file paths
            java.util.Set<String> newPaths = new java.util.HashSet<>();
            for (Map<String, Object> fileData : filesData) {
                String path = (String) fileData.get("filePath");
                if (path != null) newPaths.add(path);
            }

            // Delete files that are no longer in the list
            if (checklistDetail.getFiles() != null) {
                for (ChecklistDetailFiles existingFile : new java.util.ArrayList<>(checklistDetail.getFiles())) {
                    if (!newPaths.contains(existingFile.getFilePath())) {
                        try { 
                            fileStorageService.deleteByUrl(existingFile.getFilePath()); 
                        } catch (Exception ignored) {}
                    }
                }
            }

            // Preserve existing file creation dates
            java.util.Map<String, java.time.LocalDateTime> existingFileCreatedDates = new java.util.HashMap<>();
            if (checklistDetail.getFiles() != null) {
                for (ChecklistDetailFiles existingFile : checklistDetail.getFiles()) {
                    existingFileCreatedDates.put(existingFile.getFilePath(), existingFile.getCreatedAt());
                }
            }
            
            // Clear existing files
            if (checklistDetail.getFiles() != null) {
                checklistDetail.getFiles().clear();
            }
            
            // Add new files
            for (Map<String, Object> fileData : filesData) {
                ChecklistDetailFiles file = new ChecklistDetailFiles();
                file.setChecklistDetail(checklistDetail);
                file.setFilePath((String) fileData.get("filePath"));
                file.setFileName((String) fileData.get("fileName"));
                file.setFileType((String) fileData.get("fileType"));
                file.setFileSize(((Number) fileData.get("fileSize")).longValue());
                
                // Preserve creation date if file already existed
                String filePath = (String) fileData.get("filePath");
                if (existingFileCreatedDates.containsKey(filePath)) {
                    file.setCreatedAt(existingFileCreatedDates.get(filePath));
                } else {
                    file.setCreatedAt(timeService.nowVietnam());
                }
                
                checklistDetail.getFiles().add(file);
            }
        } catch (Exception e) {
            throw new RuntimeException("Error updating checklist detail with files: " + e.getMessage());
        }
    }

    @DeleteMapping("/{id}")
    @Transactional
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        if (repository.existsById(id)) {
            ChecklistDetail checklistDetail = repository.findById(id).orElse(null);
            if (checklistDetail != null) {
                // Delete associated files from storage
                if (checklistDetail.getFiles() != null) {
                    for (ChecklistDetailFiles file : checklistDetail.getFiles()) {
                        try {
                            fileStorageService.deleteByUrl(file.getFilePath());
                        } catch (Exception ignored) {}
                    }
                }
            }
            repository.deleteById(id);
            return ResponseEntity.noContent().build();
        }
        return ResponseEntity.notFound().build();
    }
    
    /**
     * Tự động tạo improvement record từ checklist detail khi có abnormalInfo
     */
    private void createImprovementFromChecklistDetail(ChecklistDetail checklistDetail) {
        try {
            // Kiểm tra xem đã có improvement record cho checklist detail này chưa
            String checklistDetailId = String.valueOf(checklistDetail.getId());
            
            // Tối ưu: chỉ tìm improvement có checklistDetailId tương ứng
            boolean existingImprovement = improvementsRepository.findFirstByChecklistDetailId(checklistDetailId).isPresent();
            
            if (!existingImprovement) {
                Improvements improvement = new Improvements();
                
                // Liên kết với checklist
                improvement.setChecklist(checklistDetail.getChecklist());
                
                // Liên kết với checklist detail
                improvement.setChecklistDetailId(checklistDetailId);
                
                // Hạng mục (tên công việc)
                improvement.setCategory(checklistDetail.getTaskName());
                
                // Nội dung công việc (bất thường)
                improvement.setIssueDescription(checklistDetail.getAbnormalInfo());
                
                // Người phụ trách (người thực hiện)
                improvement.setResponsible(checklistDetail.getImplementer());
                
                // Trạng thái mặc định
                improvement.setStatus("PENDING");
                
                // Tiến độ mặc định
                improvement.setProgress(0);
                
                // Thời gian tạo
                improvement.setCreatedAt(timeService.nowVietnam());
                
                // Lưu improvement record
                improvementsRepository.save(improvement);
                
                System.out.println("Created improvement record for checklist detail ID: " + checklistDetail.getId());
            }
        } catch (Exception e) {
            System.err.println("Error creating improvement from checklist detail: " + e.getMessage());
            e.printStackTrace();
        }
    }
}