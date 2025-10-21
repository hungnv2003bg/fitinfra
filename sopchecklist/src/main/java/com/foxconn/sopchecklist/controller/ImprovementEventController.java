package com.foxconn.sopchecklist.controller;

import com.foxconn.sopchecklist.dto.ImprovementEventDTO;
import com.foxconn.sopchecklist.service.ImprovementEventService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/improvement-events")
@CrossOrigin(origins = "*")
public class ImprovementEventController {

    @Autowired
    private ImprovementEventService improvementEventService;

    // Lấy tất cả events
    @GetMapping
    public ResponseEntity<List<ImprovementEventDTO>> getAllEvents() {
        List<ImprovementEventDTO> events = improvementEventService.getAllEvents();
        return ResponseEntity.ok(events);
    }

    // Lấy event theo ID
    @GetMapping("/{id}")
    public ResponseEntity<ImprovementEventDTO> getEventById(@PathVariable Long id) {
        ImprovementEventDTO event = improvementEventService.getEventById(id);
        if (event != null) {
            return ResponseEntity.ok(event);
        }
        return ResponseEntity.notFound().build();
    }

    // Tạo event mới
    @PostMapping
    public ResponseEntity<ImprovementEventDTO> createEvent(@RequestBody ImprovementEventDTO eventDTO) {
        ImprovementEventDTO createdEvent = improvementEventService.createEvent(eventDTO);
        return ResponseEntity.ok(createdEvent);
    }

    // Cập nhật event
    @PutMapping("/{id}")
    public ResponseEntity<ImprovementEventDTO> updateEvent(@PathVariable Long id, @RequestBody ImprovementEventDTO eventDTO) {
        ImprovementEventDTO updatedEvent = improvementEventService.updateEvent(id, eventDTO);
        if (updatedEvent != null) {
            return ResponseEntity.ok(updatedEvent);
        }
        return ResponseEntity.notFound().build();
    }

    // Xóa event
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteEvent(@PathVariable Long id) {
        boolean deleted = improvementEventService.deleteEvent(id);
        if (deleted) {
            return ResponseEntity.ok().build();
        }
        return ResponseEntity.notFound().build();
    }
}
