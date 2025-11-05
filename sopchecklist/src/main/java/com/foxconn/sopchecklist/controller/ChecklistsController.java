package com.foxconn.sopchecklist.controller;

import com.foxconn.sopchecklist.entity.Checklists;
import com.foxconn.sopchecklist.repository.ChecklistsRepository;
import com.foxconn.sopchecklist.repository.TimeRepeatChecklistRepository;
import com.foxconn.sopchecklist.entity.TimeRepeatChecklist;
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
    private final TimeRepeatChecklistRepository timeRepeatRepo;

    public ChecklistsController(ChecklistsRepository repository, TimeService timeService, TimeRepeatChecklistRepository timeRepeatRepo) {
        this.repository = repository;
        this.timeService = timeService;
        this.timeRepeatRepo = timeRepeatRepo;
    }

    @GetMapping
    public List<Checklists> findAll(@RequestParam(value = "groupId", required = false) Long groupId) {
        List<Checklists> list;
        if (groupId != null) {
            list = repository.findByGroupOrUsersInGroup(groupId);
        } else {
            list = repository.findAll();
        }
        computeNextSchedule(list);
        return list;
    }

    @GetMapping("/{id}")
    public ResponseEntity<Checklists> findOne(@PathVariable Long id) {
        return repository.findById(id).map(item -> {
            computeNextSchedule(java.util.Arrays.asList(item));
            return ResponseEntity.ok(item);
        }).orElse(ResponseEntity.notFound().build());
    }

    @PostMapping
    public ResponseEntity<Checklists> create(@RequestBody Checklists body) {
        // Cho phép startAt trong quá khứ để hỗ trợ nhập liệu hồi cứu
        body.setId(null);
        body.setCreatedAt(timeService.nowVietnam());
        // Set scheduleUpdatedAt khi tạo mới để đảm bảo logic scheduling hoạt động đúng
        body.setScheduleUpdatedAt(timeService.nowVietnam());
        // Preserve passed creator (username/userid string) if provided
        Checklists created = repository.save(body);
        computeNextSchedule(java.util.Arrays.asList(created));
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
            
            // Track thay đổi thời gian bắt đầu
            if (incoming.getStartAt() != null) {
                // Cho phép startAt trong quá khứ
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
            computeNextSchedule(java.util.Arrays.asList(saved));
            return ResponseEntity.ok(saved);
        }).orElse(ResponseEntity.notFound().build());
    }

    private void computeNextSchedule(java.util.List<Checklists> list) {
        java.time.ZoneId vn = java.time.ZoneId.of("Asia/Ho_Chi_Minh");
        java.time.ZonedDateTime now = java.time.ZonedDateTime.now(vn);
        for (Checklists c : list) {
            if (c.getStartAt() == null || c.getRepeatId() == null) continue;
            TimeRepeatChecklist tr = timeRepeatRepo.findById(c.getRepeatId()).orElse(null);
            if (tr == null || tr.getNumber() == null || tr.getUnit() == null) continue;
            java.time.ZonedDateTime next = c.getStartAt().atZone(vn);
            java.util.List<java.time.LocalDateTime> next3 = new java.util.ArrayList<>();
            java.time.temporal.ChronoUnit unit;
            switch (tr.getUnit().toLowerCase()) {
                case "week": unit = java.time.temporal.ChronoUnit.WEEKS; break;
                case "month": unit = java.time.temporal.ChronoUnit.MONTHS; break;
                case "year": unit = java.time.temporal.ChronoUnit.YEARS; break;
                default: unit = java.time.temporal.ChronoUnit.DAYS; break;
            }
            int step = Math.max(1, tr.getNumber());
            while (!next.isAfter(now)) {
                next = next.plus(step, unit);
            }
            c.setNextScheduledAt(next.toLocalDateTime());
            for (int i = 0; i < 3; i++) {
                next3.add(next.plus((long) i * step, unit).toLocalDateTime());
            }
            c.setNextThreeScheduled(next3);
        }
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        if (!repository.existsById(id)) return ResponseEntity.notFound().build();
        repository.deleteById(id);
        return ResponseEntity.noContent().build();
    }
}



