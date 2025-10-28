package com.foxconn.sopchecklist.controller;

import com.foxconn.sopchecklist.entity.Checklists;
import com.foxconn.sopchecklist.repository.ChecklistsRepository;
import com.foxconn.sopchecklist.service.TimeService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.net.URI;
import java.util.List;

@RestController
@RequestMapping("/api/checklists")
@CrossOrigin
public class ChecklistsController {

    private final ChecklistsRepository repository;
    private final TimeService timeService;

    public ChecklistsController(ChecklistsRepository repository, TimeService timeService) {
        this.repository = repository;
        this.timeService = timeService;
    }

    @GetMapping
    public List<Checklists> findAll() {
        return repository.findAll();
    }

    @GetMapping("/{id}")
    public ResponseEntity<Checklists> findOne(@PathVariable Long id) {
        return repository.findById(id).map(ResponseEntity::ok).orElse(ResponseEntity.notFound().build());
    }

    @PostMapping
    public ResponseEntity<Checklists> create(@RequestBody Checklists body) {
        // Validate startAt
        if (body.getStartAt() != null && body.getStartAt().isBefore(timeService.nowVietnam())) {
            throw new IllegalArgumentException("Thời gian bắt đầu phải lớn hơn thời gian hiện tại");
        }
        
        body.setId(null);
        body.setCreatedAt(timeService.nowVietnam());
        // Set scheduleUpdatedAt khi tạo mới để đảm bảo logic scheduling hoạt động đúng
        body.setScheduleUpdatedAt(timeService.nowVietnam());
        // Preserve passed creator (username/userid string) if provided
        Checklists created = repository.save(body);
        return ResponseEntity.created(URI.create("/api/checklists/" + created.getId())).body(created);
    }

    @PatchMapping("/{id}")
    public ResponseEntity<Checklists> patch(@PathVariable Long id, @RequestBody Checklists incoming) {
        return repository.findById(id).map(existed -> {
            boolean scheduleChanged = false;
            
            if (incoming.getTaskName() != null) existed.setTaskName(incoming.getTaskName());
            if (incoming.getWorkContent() != null) existed.setWorkContent(incoming.getWorkContent());
            // Allowed fields per requirement
            if (incoming.getDueInDays() != null) existed.setDueInDays(incoming.getDueInDays());
            if (incoming.getRemindInDays() != null) existed.setRemindInDays(incoming.getRemindInDays());
            
            // Track thay đổi thời gian bắt đầu
            if (incoming.getStartAt() != null) {
                // Validate startAt
                if (incoming.getStartAt().isBefore(timeService.nowVietnam())) {
                    throw new IllegalArgumentException("Thời gian bắt đầu phải lớn hơn thời gian hiện tại");
                }
                if (!java.util.Objects.equals(existed.getStartAt(), incoming.getStartAt())) {
                    scheduleChanged = true;
                }
                existed.setStartAt(incoming.getStartAt());
            }
            
            if (incoming.getImplementers() != null) existed.setImplementers(incoming.getImplementers());
            if (incoming.getSopDocumentId() != null) existed.setSopDocumentId(incoming.getSopDocumentId());
            
            // Track thay đổi thời gian lặp lại
            if (incoming.getRepeatId() != null) {
                if (!java.util.Objects.equals(existed.getRepeatId(), incoming.getRepeatId())) {
                    scheduleChanged = true;
                }
                existed.setRepeatId(incoming.getRepeatId());
            }
            
            if (incoming.getStatus() != null) existed.setStatus(incoming.getStatus());

            existed.setLastEditedAt(timeService.nowVietnam());
            if (incoming.getLastEditedBy() != null) {
                existed.setLastEditedBy(incoming.getLastEditedBy());
            }
            
            // Cập nhật thời gian thay đổi schedule nếu có thay đổi về thời gian
            if (scheduleChanged) {
                existed.setScheduleUpdatedAt(timeService.nowVietnam());
            }
            
            Checklists saved = repository.save(existed);
            return ResponseEntity.ok(saved);
        }).orElse(ResponseEntity.notFound().build());
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        if (!repository.existsById(id)) return ResponseEntity.notFound().build();
        repository.deleteById(id);
        return ResponseEntity.noContent().build();
    }
}



