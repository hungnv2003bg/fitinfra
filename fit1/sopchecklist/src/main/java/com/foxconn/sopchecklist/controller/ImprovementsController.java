package com.foxconn.sopchecklist.controller;

import com.foxconn.sopchecklist.entity.Improvements;
import com.foxconn.sopchecklist.entity.ImprovementEvent;
import com.foxconn.sopchecklist.repository.ImprovementsRepository;
import com.foxconn.sopchecklist.repository.ImprovementEventRepository;
import com.foxconn.sopchecklist.service.TimeService;
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

    public ImprovementsController(ImprovementsRepository repository, ImprovementEventRepository eventRepository, TimeService timeService) {
        this.repository = repository;
        this.eventRepository = eventRepository;
        this.timeService = timeService;
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
        Improvements created = repository.save(body);
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
            if (incoming.getStatus() != null) existed.setStatus(incoming.getStatus());
            if (incoming.getProgress() != null) existed.setProgress(incoming.getProgress());
            if (incoming.getProgressDetail() != null) existed.setProgressDetail(incoming.getProgressDetail());
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


