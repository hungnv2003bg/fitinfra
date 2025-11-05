package com.foxconn.sopchecklist.controller;

import com.foxconn.sopchecklist.entity.ChecklistDetail;
import com.foxconn.sopchecklist.entity.ChecklistDetailFiles;
import com.foxconn.sopchecklist.entity.Checklists;
import com.foxconn.sopchecklist.entity.Improvements;
import com.foxconn.sopchecklist.repository.ChecklistDetailRepository;
import com.foxconn.sopchecklist.repository.ChecklistsRepository;
import com.foxconn.sopchecklist.repository.ImprovementsRepository;
import com.foxconn.sopchecklist.repository.TypeCronMailRepository;
import com.foxconn.sopchecklist.repository.CronMailAllRepository;
import com.foxconn.sopchecklist.entity.CronMailAll;
import com.foxconn.sopchecklist.service.ChecklistDetailFileStorageService;
import com.foxconn.sopchecklist.service.MailChecklistDetailCompletionService;
import com.foxconn.sopchecklist.service.TimeService;
import com.foxconn.sopchecklist.service.MailImprovementCreationService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/checklist-details")
@CrossOrigin
public class ChecklistDetailController {

    private final ChecklistDetailRepository repository;
    private final ChecklistsRepository checklistsRepository;
    private final TimeService timeService;
    private final ImprovementsRepository improvementsRepository;
    private final MailChecklistDetailCompletionService mailCompletionService;
    private final com.foxconn.sopchecklist.service.MailChecklistService mailChecklistService;
    private final MailImprovementCreationService mailImprovementCreationService;
    
    @Autowired
    private ChecklistDetailFileStorageService fileStorageService;

    @Autowired(required = false)
    private com.foxconn.sopchecklist.service.serviceImpl.ChecklistReminderScheduler reminderScheduler;

    @Autowired
    private TypeCronMailRepository typeCronMailRepository;

    @Autowired
    private CronMailAllRepository cronMailAllRepository;

    public ChecklistDetailController(ChecklistDetailRepository repository, ChecklistsRepository checklistsRepository, TimeService timeService, ImprovementsRepository improvementsRepository, MailChecklistDetailCompletionService mailCompletionService, com.foxconn.sopchecklist.service.MailChecklistService mailChecklistService, MailImprovementCreationService mailImprovementCreationService) {
        this.repository = repository;
        this.checklistsRepository = checklistsRepository;
        this.timeService = timeService;
        this.improvementsRepository = improvementsRepository;
        this.mailCompletionService = mailCompletionService;
        this.mailChecklistService = mailChecklistService;
        this.mailImprovementCreationService = mailImprovementCreationService;
    }

    @GetMapping
    public List<ChecklistDetail> findAll(
            @RequestParam(value = "parentId", required = false) Long parentId,
            @RequestParam(value = "status", required = false) String status,
            @RequestParam(value = "groupId", required = false) Long groupId,
            @RequestParam(value = "q", required = false) String q
    ) {
        if (parentId != null) {
            return checklistsRepository.findById(parentId)
                    .map(cl -> {
                        String implementer = (groupId != null) ? ("group:" + groupId) : null;
                        if (q != null && !q.isEmpty()) {
                            if (status != null && implementer != null) {
                                return repository.searchByChecklistAndStatusAndImplementerAndQOrderByCreatedAtDesc(cl, status, implementer, q);
                            } else if (status != null) {
                                return repository.searchByChecklistAndStatusAndQOrderByCreatedAtDesc(cl, status, q);
                            } else if (implementer != null) {
                                return repository.searchByChecklistAndImplementerAndQOrderByCreatedAtDesc(cl, implementer, q);
                            } else {
                                return repository.searchByChecklistAndQOrderByCreatedAtDesc(cl, q);
                            }
                        } else {
                            if (status != null && implementer != null) {
                                return repository.findByChecklistAndStatusAndImplementerOrderByCreatedAtDesc(cl, status, implementer);
                            } else if (status != null) {
                                return repository.findByChecklistAndStatusOrderByCreatedAtDesc(cl, status);
                            } else if (implementer != null) {
                                return repository.findByChecklistAndImplementerOrderByCreatedAtDesc(cl, implementer);
                            }
                            return repository.findByChecklistOrderByCreatedAtDesc(cl);
                        }
                    })
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
    public ResponseEntity<List<ChecklistDetail>> findByChecklist(@PathVariable Long checklistId,
                                                                 @RequestParam(value = "status", required = false) String status,
                                                                 @RequestParam(value = "groupId", required = false) Long groupId,
                                                                 @RequestParam(value = "q", required = false) String q) {
        return checklistsRepository.findById(checklistId)
                .map(cl -> {
                    String implementer = (groupId != null) ? ("group:" + groupId) : null;
                    if (q != null && !q.isEmpty()) {
                        if (status != null && implementer != null) {
                            return repository.searchByChecklistAndStatusAndImplementerAndQOrderByCreatedAtDesc(cl, status, implementer, q);
                        } else if (status != null) {
                            return repository.searchByChecklistAndStatusAndQOrderByCreatedAtDesc(cl, status, q);
                        } else if (implementer != null) {
                            return repository.searchByChecklistAndImplementerAndQOrderByCreatedAtDesc(cl, implementer, q);
                        } else {
                            return repository.searchByChecklistAndQOrderByCreatedAtDesc(cl, q);
                        }
                    } else {
                        if (status != null && implementer != null) {
                            return repository.findByChecklistAndStatusAndImplementerOrderByCreatedAtDesc(cl, status, implementer);
                        } else if (status != null) {
                            return repository.findByChecklistAndStatusOrderByCreatedAtDesc(cl, status);
                        } else if (implementer != null) {
                            return repository.findByChecklistAndImplementerOrderByCreatedAtDesc(cl, implementer);
                        }
                        return repository.findByChecklistOrderByCreatedAtDesc(cl);
                    }
                })
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
                    // Gửi mail thông báo khi hoàn thành checklist detail
                    try {
                        mailCompletionService.queueChecklistDetailCompletionMail(existed);
                    } catch (Exception e) {
                        // Log error nhưng không làm fail transaction
                        System.err.println("Failed to queue completion mail for checklist detail " + existed.getId() + ": " + e.getMessage());
                    }
                }
            }
            if (updates.containsKey("uploadFile")) existed.setUploadFile((String) updates.get("uploadFile"));
            if (updates.containsKey("note")) existed.setNote((String) updates.get("note"));
            if (updates.containsKey("abnormalInfo")) {
                String newAbnormalInfo = (String) updates.get("abnormalInfo");
                existed.setAbnormalInfo(newAbnormalInfo);

                // Cập nhật improvement dựa trên nội dung abnormalInfo
                String checklistDetailId = String.valueOf(existed.getId());
                
                // Chỉ tìm improvement hiện có cho checklist detail này theo checklistDetailId
                Improvements existingImprovement = improvementsRepository
                        .findFirstByChecklistDetailId(checklistDetailId)
                        .orElse(null);
                
                if (existingImprovement != null) {
                    // Cập nhật improvement hiện có
                    boolean hadEmptyBefore = existingImprovement.getIssueDescription() == null || existingImprovement.getIssueDescription().trim().isEmpty();
                    if (newAbnormalInfo != null && !newAbnormalInfo.trim().isEmpty()) {
                        // Có nội dung: cập nhật issueDescription
                        existingImprovement.setIssueDescription(newAbnormalInfo);
                        Improvements savedImprovement = improvementsRepository.save(existingImprovement);
                        // Nếu trước đó chưa có nội dung, coi như lần đầu phát sinh -> gửi mail thông báo
                        if (hadEmptyBefore) {
                            try {
                                mailImprovementCreationService.queueImprovementCreatedMail(existed, savedImprovement);
                            } catch (Exception e) {
                                System.err.println("Failed to queue improvement creation mail for checklist detail " + existed.getId() + ": " + e.getMessage());
                            }
                        }
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

    @PostMapping("/{id}/send-mail")
    public ResponseEntity<Map<String, Object>> sendMail(@PathVariable Long id) {
        Map<String, Object> result = new java.util.HashMap<>();
        
        try {
            ChecklistDetail detail = repository.findById(id).orElse(null);
            if (detail == null) {
                result.put("success", false);
                result.put("message", "Checklist detail not found");
                return ResponseEntity.notFound().build();
            }
            
            // Đây là nút nhắc việc: chỉ gửi khi chưa hoàn thành
            if ("COMPLETED".equalsIgnoreCase(detail.getStatus()) || "DONE".equalsIgnoreCase(detail.getStatus())) {
                result.put("success", false);
                result.put("message", "Checklist detail đã hoàn thành, không thể gửi nhắc việc");
                return ResponseEntity.badRequest().body(result);
            }

            // Gửi mail nhắc việc cần hoàn thành gấp
            mailChecklistService.queueChecklistReminderMail(detail);
            
            result.put("success", true);
            result.put("message", "Đã gửi mail nhắc việc cho checklist detail");
            return ResponseEntity.ok(result);
            
        } catch (Exception e) {
            result.put("success", false);
            result.put("message", "Lỗi khi gửi mail: " + e.getMessage());
            return ResponseEntity.internalServerError().body(result);
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

    @PostMapping("/test-reminder-scheduler")
    public ResponseEntity<Map<String, Object>> testReminderScheduler() {
        Map<String, Object> result = new java.util.HashMap<>();
        try {
            if (reminderScheduler == null) {
                result.put("success", false);
                result.put("message", "ChecklistReminderScheduler is not available. Please ensure the scheduler is properly configured.");
                return ResponseEntity.badRequest().body(result);
            }
            
            reminderScheduler.checkAndSendReminders();
            
            result.put("success", true);
            result.put("message", "Reminder scheduler executed successfully. Check logs for details.");
            return ResponseEntity.ok(result);
        } catch (Exception e) {
            result.put("success", false);
            result.put("message", "Error executing reminder scheduler: " + e.getMessage());
            e.printStackTrace();
            return ResponseEntity.internalServerError().body(result);
        }
    }

    @GetMapping("/debug-overdue")
    public ResponseEntity<Map<String, Object>> debugOverdue() {
        Map<String, Object> result = new java.util.HashMap<>();
        try {
            LocalDateTime now = timeService.nowVietnam();
            result.put("currentTime", now.toString());
            
            // Kiểm tra TypeCronMail
            com.foxconn.sopchecklist.entity.TypeCronMail checklistType = typeCronMailRepository.findByTypeName("CHECKLIST");
            result.put("checklistTypeExists", checklistType != null);
            if (checklistType != null) {
                result.put("checklistTypeId", checklistType.getId());
            } else {
                result.put("checklistTypeId", null);
                result.put("warning", "CHECKLIST type not found in TypeCronMail table");
            }
            
            // Tìm checklist detail đến deadline
            List<ChecklistDetail> overdueDetails = repository
                    .findByDeadlineAtBeforeOrEqualAndStatusNotCompleted(now);
            
            result.put("overdueCount", overdueDetails.size());
            result.put("overdueDetails", overdueDetails.stream().map(d -> {
                Map<String, Object> detailInfo = new java.util.HashMap<>();
                detailInfo.put("id", d.getId());
                detailInfo.put("taskName", d.getTaskName());
                detailInfo.put("deadlineAt", d.getDeadlineAt() != null ? d.getDeadlineAt().toString() : null);
                detailInfo.put("status", d.getStatus());
                detailInfo.put("implementer", d.getImplementer());
                detailInfo.put("hasDeadline", d.getDeadlineAt() != null);
                detailInfo.put("deadlinePassed", d.getDeadlineAt() != null && !d.getDeadlineAt().isAfter(now));
                detailInfo.put("isNotCompleted", d.getStatus() == null || 
                    (!d.getStatus().equals("COMPLETED") && !d.getStatus().equals("DONE")));
                detailInfo.put("hasImplementer", d.getImplementer() != null && !d.getImplementer().trim().isEmpty());
                
                // Kiểm tra xem có mail reminder đã gửi trong 24h không
                if (checklistType != null && d.getId() != null) {
                    try {
                        LocalDateTime twentyFourHoursAgo = now.minusHours(24);
                        List<CronMailAll> recentReminders = 
                            cronMailAllRepository.findReminderMailsByTypeIdAndReferenceIdAndCreatedAtAfter(
                                checklistType.getId(), d.getId(), twentyFourHoursAgo);
                        detailInfo.put("recentRemindersCount", recentReminders.size());
                        detailInfo.put("willSkip", !recentReminders.isEmpty());
                    } catch (Exception e) {
                        detailInfo.put("recentRemindersError", e.getMessage());
                    }
                }
                
                return detailInfo;
            }).collect(Collectors.toList()));
            
            return ResponseEntity.ok(result);
        } catch (Exception e) {
            result.put("error", e.getMessage());
            e.printStackTrace();
            return ResponseEntity.internalServerError().body(result);
        }
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
                String implementer = checklistDetail.getImplementer();
                if (implementer != null && !implementer.isEmpty()) {
                    improvement.setResponsible(java.util.Collections.singletonList(implementer));
                }
                
                // Trạng thái mặc định
                improvement.setStatus("PENDING");
                
                // Tiến độ theo dõi ở bảng improvement_progress
                // Đặt tiến độ mặc định = 0 để bảng Improvement hiển thị đúng từ đầu
                improvement.setProgress(0);
                
                // Thời gian tạo
                improvement.setCreatedAt(timeService.nowVietnam());
                
                // Lưu improvement record
                Improvements savedImprovement = improvementsRepository.save(improvement);
                
                // Sau khi tạo improvement từ bất thường, xếp hàng gửi mail thông báo
                try {
                    mailImprovementCreationService.queueImprovementCreatedMail(checklistDetail, savedImprovement);
                } catch (Exception e) {
                    System.err.println("Failed to queue improvement creation mail for checklist detail " + checklistDetail.getId() + ": " + e.getMessage());
                }
                
                System.out.println("Created improvement record for checklist detail ID: " + checklistDetail.getId());
            }
        } catch (Exception e) {
            System.err.println("Error creating improvement from checklist detail: " + e.getMessage());
            e.printStackTrace();
        }
    }
}