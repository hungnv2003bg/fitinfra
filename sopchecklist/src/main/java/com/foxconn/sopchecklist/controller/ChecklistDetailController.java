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

    private boolean isImprovementCompleted(ChecklistDetail detail) {
        String checklistDetailId = String.valueOf(detail.getId());
        Improvements relatedImprovement = improvementsRepository
                .findFirstByChecklistDetailId(checklistDetailId)
                .orElse(null);
        
        if (relatedImprovement != null) {
            String status = relatedImprovement.getStatus();
            return "DONE".equalsIgnoreCase(status) || "COMPLETED".equalsIgnoreCase(status) || "Hoàn thành".equals(status);
        }
        return false;
    }

    private ChecklistDetail enrichWithImprovementStatus(ChecklistDetail detail) {
        detail.setHasCompletedImprovement(isImprovementCompleted(detail));
        return detail;
    }

    private void updateAbnormalInfoAndImprovement(ChecklistDetail existed, String newAbnormalInfo) {
        existed.setAbnormalInfo(newAbnormalInfo);

        String checklistDetailId = String.valueOf(existed.getId());
        
        Improvements existingImprovement = improvementsRepository
                .findFirstByChecklistDetailId(checklistDetailId)
                .orElse(null);
        
        if (existingImprovement != null) {
            boolean hadEmptyBefore = existingImprovement.getIssueDescription() == null || existingImprovement.getIssueDescription().trim().isEmpty();
            if (newAbnormalInfo != null && !newAbnormalInfo.trim().isEmpty()) {
                existingImprovement.setIssueDescription(newAbnormalInfo);
                Improvements savedImprovement = improvementsRepository.save(existingImprovement);
                if (hadEmptyBefore) {
                    try {
                        mailImprovementCreationService.queueImprovementCreatedMail(existed, savedImprovement);
                    } catch (Exception e) {
                        System.err.println("Failed to queue improvement creation mail for checklist detail " + existed.getId() + ": " + e.getMessage());
                    }
                }
            }
        } else if (newAbnormalInfo != null && !newAbnormalInfo.trim().isEmpty()) {
            createImprovementFromChecklistDetail(existed);
        }
    }

    @GetMapping
    public List<ChecklistDetail> findAll(
            @RequestParam(value = "parentId", required = false) Long parentId,
            @RequestParam(value = "status", required = false) String status,
            @RequestParam(value = "groupId", required = false) Long groupId,
            @RequestParam(value = "q", required = false) String q
    ) {
        List<ChecklistDetail> details;
        if (parentId != null) {
            details = checklistsRepository.findById(parentId)
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
        } else {
            details = repository.findAll();
        }
        
        return details.stream()
                .map(this::enrichWithImprovementStatus)
                .collect(Collectors.toList());
    }

    @PostMapping("/create-improvements-for-existing")
    public ResponseEntity<Map<String, Object>> createImprovementsForExisting() {
        Map<String, Object> result = new java.util.HashMap<>();
        int createdCount = 0;
        
        try {
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
                    List<ChecklistDetail> details;
                    if (q != null && !q.isEmpty()) {
                        if (status != null && implementer != null) {
                            details = repository.searchByChecklistAndStatusAndImplementerAndQOrderByCreatedAtDesc(cl, status, implementer, q);
                        } else if (status != null) {
                            details = repository.searchByChecklistAndStatusAndQOrderByCreatedAtDesc(cl, status, q);
                        } else if (implementer != null) {
                            details = repository.searchByChecklistAndImplementerAndQOrderByCreatedAtDesc(cl, implementer, q);
                        } else {
                            details = repository.searchByChecklistAndQOrderByCreatedAtDesc(cl, q);
                        }
                    } else {
                        if (status != null && implementer != null) {
                            details = repository.findByChecklistAndStatusAndImplementerOrderByCreatedAtDesc(cl, status, implementer);
                        } else if (status != null) {
                            details = repository.findByChecklistAndStatusOrderByCreatedAtDesc(cl, status);
                        } else if (implementer != null) {
                            details = repository.findByChecklistAndImplementerOrderByCreatedAtDesc(cl, implementer);
                        } else {
                            details = repository.findByChecklistOrderByCreatedAtDesc(cl);
                        }
                    }
                    
                    return details.stream()
                            .map(this::enrichWithImprovementStatus)
                            .collect(Collectors.toList());
                })
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @GetMapping("/{id}")
    public ResponseEntity<ChecklistDetail> findOne(@PathVariable Long id) {
        return repository.findById(id)
                .map(this::enrichWithImprovementStatus)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @PatchMapping("/{id}")
    @Transactional
    public ResponseEntity<ChecklistDetail> updateFields(@PathVariable Long id, @RequestBody Map<String, Object> updates) {
        return repository.findById(id).map(existed -> {
            if (updates.containsKey("status")) {
                String newStatus = (String) updates.get("status");
                existed.setStatus(newStatus);
                if ("COMPLETED".equals(newStatus) || "DONE".equals(newStatus)) {
                    existed.setLastEditedAt(timeService.nowVietnam());
                    try {
                        mailCompletionService.queueChecklistDetailCompletionMail(existed);
                    } catch (Exception e) {
                        System.err.println("Failed to queue completion mail for checklist detail " + existed.getId() + ": " + e.getMessage());
                    }
                }
            }
            if (updates.containsKey("uploadFile")) existed.setUploadFile((String) updates.get("uploadFile"));
            if (updates.containsKey("note")) existed.setNote((String) updates.get("note"));
            if (updates.containsKey("abnormalInfo")) {
                String checklistDetailId = String.valueOf(existed.getId());
                
                Improvements relatedImprovement = improvementsRepository
                        .findFirstByChecklistDetailId(checklistDetailId)
                        .orElse(null);
                
                if (relatedImprovement != null) {
                    String improvementStatus = relatedImprovement.getStatus();
                    boolean improvementCompleted = "DONE".equalsIgnoreCase(improvementStatus) || 
                                                   "COMPLETED".equalsIgnoreCase(improvementStatus) || 
                                                   "Hoàn thành".equals(improvementStatus);
                    
                    if (improvementCompleted) {
                        System.out.println("Skipping abnormalInfo update for checklist detail " + existed.getId() + " because related improvement is completed");
                    } else {
                        updateAbnormalInfoAndImprovement(existed, (String) updates.get("abnormalInfo"));
                    }
                } else {
                    updateAbnormalInfoAndImprovement(existed, (String) updates.get("abnormalInfo"));
                }
            }
            if (updates.containsKey("lastEditedBy")) {
                Object lastEditedBy = updates.get("lastEditedBy");
                if (lastEditedBy instanceof Number) {
                    existed.setLastEditedBy(((Number) lastEditedBy).longValue());
                }
            }
            existed.setLastEditedAt(timeService.nowVietnam());
            
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
            java.util.Set<String> newPaths = new java.util.HashSet<>();
            for (Map<String, Object> fileData : filesData) {
                String path = (String) fileData.get("filePath");
                if (path != null) newPaths.add(path);
            }

            if (checklistDetail.getFiles() != null) {
                for (ChecklistDetailFiles existingFile : new java.util.ArrayList<>(checklistDetail.getFiles())) {
                    if (!newPaths.contains(existingFile.getFilePath())) {
                        try { 
                            fileStorageService.deleteByUrl(existingFile.getFilePath()); 
                        } catch (Exception ignored) {}
                    }
                }
            }

            java.util.Map<String, java.time.LocalDateTime> existingFileCreatedDates = new java.util.HashMap<>();
            if (checklistDetail.getFiles() != null) {
                for (ChecklistDetailFiles existingFile : checklistDetail.getFiles()) {
                    existingFileCreatedDates.put(existingFile.getFilePath(), existingFile.getCreatedAt());
                }
            }
            
            if (checklistDetail.getFiles() != null) {
                checklistDetail.getFiles().clear();
            }
            
            for (Map<String, Object> fileData : filesData) {
                ChecklistDetailFiles file = new ChecklistDetailFiles();
                file.setChecklistDetail(checklistDetail);
                file.setFilePath((String) fileData.get("filePath"));
                file.setFileName((String) fileData.get("fileName"));
                file.setFileType((String) fileData.get("fileType"));
                file.setFileSize(((Number) fileData.get("fileSize")).longValue());
                
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
            
            if ("COMPLETED".equalsIgnoreCase(detail.getStatus()) || "DONE".equalsIgnoreCase(detail.getStatus())) {
                result.put("success", false);
                result.put("message", "Checklist detail đã hoàn thành, không thể gửi nhắc việc");
                return ResponseEntity.badRequest().body(result);
            }

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
            
            com.foxconn.sopchecklist.entity.TypeCronMail checklistType = typeCronMailRepository.findByTypeName("CHECKLIST");
            result.put("checklistTypeExists", checklistType != null);
            if (checklistType != null) {
                result.put("checklistTypeId", checklistType.getId());
            } else {
                result.put("checklistTypeId", null);
                result.put("warning", "CHECKLIST type not found in TypeCronMail table");
            }
            
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
    

    private void createImprovementFromChecklistDetail(ChecklistDetail checklistDetail) {
        try {
           
            String checklistDetailId = String.valueOf(checklistDetail.getId());
            
            boolean existingImprovement = improvementsRepository.findFirstByChecklistDetailId(checklistDetailId).isPresent();
            
            if (!existingImprovement) {
                Improvements improvement = new Improvements();
                
                improvement.setChecklist(checklistDetail.getChecklist());
                
                improvement.setChecklistDetailId(checklistDetailId);
                
                improvement.setCategory(checklistDetail.getTaskName());
                
                improvement.setIssueDescription(checklistDetail.getAbnormalInfo());
                
                String implementer = checklistDetail.getImplementer();
                if (implementer != null && !implementer.isEmpty()) {
                    improvement.setResponsible(java.util.Collections.singletonList(implementer));
                }
                
                improvement.setStatus("PENDING");
                
                improvement.setProgress(0);
                
                improvement.setCreatedAt(timeService.nowVietnam());
                
                Improvements savedImprovement = improvementsRepository.save(improvement);
                
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