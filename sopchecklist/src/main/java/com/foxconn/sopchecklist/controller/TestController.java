package com.foxconn.sopchecklist.controller;

import com.foxconn.sopchecklist.entity.ChecklistDetail;
import com.foxconn.sopchecklist.repository.ChecklistDetailRepository;
import com.foxconn.sopchecklist.service.MailChecklistDetailCompletionService;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/test")
@CrossOrigin
public class TestController {

    private final ChecklistDetailRepository checklistDetailRepository;
    private final MailChecklistDetailCompletionService mailCompletionService;

    public TestController(ChecklistDetailRepository checklistDetailRepository, 
                         MailChecklistDetailCompletionService mailCompletionService) {
        this.checklistDetailRepository = checklistDetailRepository;
        this.mailCompletionService = mailCompletionService;
    }

    @PostMapping("/complete-checklist-detail/{id}")
    public String testCompleteChecklistDetail(@PathVariable Long id) {
        try {
            ChecklistDetail detail = checklistDetailRepository.findById(id).orElse(null);
            if (detail == null) {
                return "ChecklistDetail not found with id: " + id;
            }
            
            // Set status to COMPLETED
            detail.setStatus("COMPLETED");
            detail.setLastEditedAt(java.time.LocalDateTime.now());
            checklistDetailRepository.save(detail);
            
            // Trigger mail notification
            mailCompletionService.queueChecklistDetailCompletionMail(detail);
            
            return "Successfully completed checklist detail " + id + " and queued mail notification";
        } catch (Exception e) {
            return "Error: " + e.getMessage();
        }
    }
}
