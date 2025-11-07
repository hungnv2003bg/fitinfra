package com.foxconn.sopchecklist.controller;

import com.foxconn.sopchecklist.entity.Improvements;
import com.foxconn.sopchecklist.entity.ImprovementEvent;
import com.foxconn.sopchecklist.repository.ImprovementsRepository;
import com.foxconn.sopchecklist.repository.ImprovementEventRepository;
import com.foxconn.sopchecklist.service.TimeService;
import com.foxconn.sopchecklist.service.MailImprovementDoneService;
import com.foxconn.sopchecklist.service.MailImprovementCreationService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.net.URI;
import java.util.List;
import java.time.LocalDateTime;

@RestController
@RequestMapping("/api/improvements")
@CrossOrigin
public class ImprovementsController {

    private final ImprovementsRepository repository;
    private final ImprovementEventRepository eventRepository;
    private final TimeService timeService;
    private final MailImprovementDoneService mailImprovementDoneService;
    private final MailImprovementCreationService mailImprovementCreationService;

    public ImprovementsController(ImprovementsRepository repository, ImprovementEventRepository eventRepository, TimeService timeService, MailImprovementDoneService mailImprovementDoneService, MailImprovementCreationService mailImprovementCreationService) {
        this.repository = repository;
        this.eventRepository = eventRepository;
        this.timeService = timeService;
        this.mailImprovementDoneService = mailImprovementDoneService;
        this.mailImprovementCreationService = mailImprovementCreationService;
    }

    @GetMapping
    public List<Improvements> findAll() {
        try {
            List<Improvements> improvements = repository.findAll();
            // Ensure all relationships are loaded to avoid lazy loading issues
            for (Improvements improvement : improvements) {
                if (improvement.getChecklist() != null) {
                    improvement.getChecklist().getId(); // Trigger lazy loading
                }
                if (improvement.getImprovementEvent() != null) {
                    improvement.getImprovementEvent().getId(); // Trigger lazy loading
                }
            }
            return improvements;
        } catch (Exception e) {
            System.err.println("Error fetching improvements: " + e.getMessage());
            e.printStackTrace();
            return List.of();
        }
    }

    @GetMapping("/{id}")
    public ResponseEntity<Improvements> findOne(@PathVariable Integer id) {
        return repository.findById(id).map(ResponseEntity::ok).orElse(ResponseEntity.notFound().build());
    }

    @PostMapping
    public ResponseEntity<Improvements> create(@RequestBody Improvements body) {
        body.setImprovementID(null);
        body.setCreatedAt(timeService.nowVietnam());
        // createdBy if provided
        if (body.getCreatedBy() == null && body.getLastEditedBy() != null) {
            body.setCreatedBy(body.getLastEditedBy());
        }
        
        // Set lastEditedBy and lastEditedAt for new records
        if (body.getLastEditedBy() != null) {
            body.setLastEditedAt(timeService.nowVietnam());
        }
        
        // Convert plannedDueAt from UTC to Vietnam timezone (+7)
        if (body.getPlannedDueAt() != null) {
            LocalDateTime utcTime = body.getPlannedDueAt();
            LocalDateTime vietnamTime = utcTime.atZone(java.time.ZoneId.of("UTC"))
                .withZoneSameInstant(java.time.ZoneId.of("Asia/Ho_Chi_Minh"))
                .toLocalDateTime();
            body.setPlannedDueAt(vietnamTime);
        }
        
        // Convert completedAt from UTC to Vietnam timezone (+7)
        if (body.getCompletedAt() != null) {
            LocalDateTime utcTime = body.getCompletedAt();
            LocalDateTime vietnamTime = utcTime.atZone(java.time.ZoneId.of("UTC"))
                .withZoneSameInstant(java.time.ZoneId.of("Asia/Ho_Chi_Minh"))
                .toLocalDateTime();
            body.setCompletedAt(vietnamTime);
        }
        
        // Map improvement event if provided
        if (body.getImprovementEvent() != null && body.getImprovementEvent().getId() != null) {
            ImprovementEvent event = eventRepository.findById(body.getImprovementEvent().getId()).orElse(null);
            body.setImprovementEvent(event);
        }
        // Ensure default progress and status on creation
        if (body.getProgress() == null) {
            body.setProgress(0);
        }
        if (body.getStatus() == null || body.getStatus().trim().isEmpty()) {
            body.setStatus("PENDING");
        }
        Improvements created = repository.save(body);
        
        // Gửi mail thông báo khi tạo mới cải thiện
        try {
            mailImprovementCreationService.queueDirectImprovementCreationMail(created);
        } catch (Exception e) {
            System.err.println("Failed to queue improvement creation mail for improvement " + created.getImprovementID() + ": " + e.getMessage());
        }
        
        return ResponseEntity.created(URI.create("/api/improvements/" + created.getImprovementID())).body(created);
    }

    @PatchMapping("/{id}")
    public ResponseEntity<Improvements> update(@PathVariable Integer id, @RequestBody Improvements incoming) {
        return repository.findById(id).map(existed -> {
            if (incoming.getCategory() != null) existed.setCategory(incoming.getCategory());
            if (incoming.getIssueDescription() != null) existed.setIssueDescription(incoming.getIssueDescription());
            if (incoming.getResponsible() != null) existed.setResponsible(incoming.getResponsible());
            if (incoming.getCollaborators() != null) existed.setCollaborators(incoming.getCollaborators());
            if (incoming.getActionPlan() != null) existed.setActionPlan(incoming.getActionPlan());
            if (incoming.getPlannedDueAt() != null) {
                // Frontend gửi UTC time, cần convert về Vietnam timezone (+7)
                LocalDateTime utcTime = incoming.getPlannedDueAt();
                LocalDateTime vietnamTime = utcTime.atZone(java.time.ZoneId.of("UTC"))
                    .withZoneSameInstant(java.time.ZoneId.of("Asia/Ho_Chi_Minh"))
                    .toLocalDateTime();
                existed.setPlannedDueAt(vietnamTime);
            }
            if (incoming.getCompletedAt() != null) {
                // Frontend gửi UTC time, cần convert về Vietnam timezone (+7)
                LocalDateTime utcTime = incoming.getCompletedAt();
                LocalDateTime vietnamTime = utcTime.atZone(java.time.ZoneId.of("UTC"))
                    .withZoneSameInstant(java.time.ZoneId.of("Asia/Ho_Chi_Minh"))
                    .toLocalDateTime();
                existed.setCompletedAt(vietnamTime);
            }
            if (incoming.getNote() != null) existed.setNote(incoming.getNote());
            if (incoming.getFiles() != null) existed.setFiles(incoming.getFiles());
            
            // Track status change for completion email
            String oldStatus = existed.getStatus();
            boolean wasNotDone = oldStatus == null || (!oldStatus.equals("DONE") && !oldStatus.equals("COMPLETED"));
            boolean wasDone = oldStatus != null && (oldStatus.equals("DONE") || oldStatus.equals("COMPLETED"));
            
            if (incoming.getStatus() != null) {
                existed.setStatus(incoming.getStatus());
            }
            
            // Set completedAt when status becomes DONE or COMPLETED
            // Xóa completedAt khi status chuyển từ DONE/COMPLETED về status khác
            String newStatus = existed.getStatus();
            if (newStatus != null && (newStatus.equals("DONE") || newStatus.equals("COMPLETED"))) {
                // Status là DONE hoặc COMPLETED
                if (existed.getCompletedAt() == null || (incoming.getCompletedAt() != null)) {
                    if (incoming.getCompletedAt() != null) {
                        existed.setCompletedAt(incoming.getCompletedAt());
                    } else if (existed.getCompletedAt() == null) {
                        existed.setCompletedAt(timeService.nowVietnam());
                    }
                }
            } else {
                // Status không phải DONE hoặc COMPLETED - xóa completedAt nếu trước đó đã DONE
                if (wasDone) {
                    existed.setCompletedAt(null);
                }
            }
            
            if (incoming.getLastEditedBy() != null) existed.setLastEditedBy(incoming.getLastEditedBy());

            // Map improvement event if provided in payload as nested object { improvementEvent: { id } }
            if (incoming.getImprovementEvent() != null) {
                if (incoming.getImprovementEvent().getId() != null) {
                    ImprovementEvent event = eventRepository.findById(incoming.getImprovementEvent().getId()).orElse(null);
                    existed.setImprovementEvent(event);
                } else {
                    // allow clearing the event by sending null id
                    existed.setImprovementEvent(null);
                }
            }

            existed.setLastEditedAt(timeService.nowVietnam());
            Improvements saved = repository.save(existed);
            
            // Gửi mail thông báo hoàn thành nếu status chuyển từ không phải DONE/COMPLETED sang DONE/COMPLETED
            if (wasNotDone && newStatus != null && (newStatus.equals("DONE") || newStatus.equals("COMPLETED"))) {
                try {
                    mailImprovementDoneService.queueImprovementDoneMail(saved);
                } catch (Exception e) {
                    System.err.println("Failed to queue improvement done mail for improvement " + saved.getImprovementID() + ": " + e.getMessage());
                }
            }
            
            return ResponseEntity.ok(saved);
        }).orElse(ResponseEntity.notFound().build());
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable Integer id) {
        if (!repository.existsById(id)) return ResponseEntity.notFound().build();
        repository.deleteById(id);
        return ResponseEntity.noContent().build();
    }
}


