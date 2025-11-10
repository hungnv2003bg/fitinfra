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
            for (Improvements improvement : improvements) {
                if (improvement.getChecklist() != null) {
                    improvement.getChecklist().getId(); 
                }
                if (improvement.getImprovementEvent() != null) {
                    improvement.getImprovementEvent().getId(); 
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
        if (body.getCreatedBy() == null && body.getLastEditedBy() != null) {
            body.setCreatedBy(body.getLastEditedBy());
        }
        
        if (body.getLastEditedBy() != null) {
            body.setLastEditedAt(timeService.nowVietnam());
        }
        
        if (body.getPlannedDueAt() != null) {
            LocalDateTime utcTime = body.getPlannedDueAt();
            LocalDateTime vietnamTime = utcTime.atZone(java.time.ZoneId.of("UTC"))
                .withZoneSameInstant(java.time.ZoneId.of("Asia/Ho_Chi_Minh"))
                .toLocalDateTime();
            body.setPlannedDueAt(vietnamTime);
        }
        
        if (body.getCompletedAt() != null) {
            LocalDateTime utcTime = body.getCompletedAt();
            LocalDateTime vietnamTime = utcTime.atZone(java.time.ZoneId.of("UTC"))
                .withZoneSameInstant(java.time.ZoneId.of("Asia/Ho_Chi_Minh"))
                .toLocalDateTime();
            body.setCompletedAt(vietnamTime);
        }
        
        if (body.getImprovementEvent() != null && body.getImprovementEvent().getId() != null) {
            ImprovementEvent event = eventRepository.findById(body.getImprovementEvent().getId()).orElse(null);
            body.setImprovementEvent(event);
        }
        if (body.getProgress() == null) {
            body.setProgress(0);
        }
        if (body.getStatus() == null || body.getStatus().trim().isEmpty()) {
            body.setStatus("PENDING");
        }
        Improvements created = repository.save(body);
        
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
                LocalDateTime utcTime = incoming.getPlannedDueAt();
                LocalDateTime vietnamTime = utcTime.atZone(java.time.ZoneId.of("UTC"))
                    .withZoneSameInstant(java.time.ZoneId.of("Asia/Ho_Chi_Minh"))
                    .toLocalDateTime();
                existed.setPlannedDueAt(vietnamTime);
            }
            if (incoming.getCompletedAt() != null) {
                LocalDateTime utcTime = incoming.getCompletedAt();
                LocalDateTime vietnamTime = utcTime.atZone(java.time.ZoneId.of("UTC"))
                    .withZoneSameInstant(java.time.ZoneId.of("Asia/Ho_Chi_Minh"))
                    .toLocalDateTime();
                existed.setCompletedAt(vietnamTime);
            }
            if (incoming.getNote() != null) existed.setNote(incoming.getNote());
            if (incoming.getFiles() != null) existed.setFiles(incoming.getFiles());
            
            String oldStatus = existed.getStatus();
            boolean wasNotDone = oldStatus == null || (!oldStatus.equals("DONE") && !oldStatus.equals("COMPLETED"));
            boolean wasDone = oldStatus != null && (oldStatus.equals("DONE") || oldStatus.equals("COMPLETED"));
            
            if (incoming.getStatus() != null) {
                existed.setStatus(incoming.getStatus());
            }
            
            String newStatus = existed.getStatus();
            if (newStatus != null && (newStatus.equals("DONE") || newStatus.equals("COMPLETED"))) {
                if (existed.getCompletedAt() == null || (incoming.getCompletedAt() != null)) {
                    if (incoming.getCompletedAt() != null) {
                        existed.setCompletedAt(incoming.getCompletedAt());
                    } else if (existed.getCompletedAt() == null) {
                        existed.setCompletedAt(timeService.nowVietnam());
                    }
                }
            } else {
                if (wasDone) {
                    existed.setCompletedAt(null);
                }
            }
            
            if (incoming.getLastEditedBy() != null) existed.setLastEditedBy(incoming.getLastEditedBy());

            if (incoming.getImprovementEvent() != null) {
                if (incoming.getImprovementEvent().getId() != null) {
                    ImprovementEvent event = eventRepository.findById(incoming.getImprovementEvent().getId()).orElse(null);
                    existed.setImprovementEvent(event);
                } else {
                    existed.setImprovementEvent(null);
                }
            }

            existed.setLastEditedAt(timeService.nowVietnam());
            Improvements saved = repository.save(existed);
            
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


