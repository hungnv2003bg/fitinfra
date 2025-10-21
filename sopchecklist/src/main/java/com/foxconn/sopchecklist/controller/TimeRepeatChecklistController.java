package com.foxconn.sopchecklist.controller;

import com.foxconn.sopchecklist.entity.TimeRepeatChecklist;
import com.foxconn.sopchecklist.repository.TimeRepeatChecklistRepository;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.net.URI;
import java.util.List;

@RestController
@RequestMapping("/api/time-repeats")
@CrossOrigin
public class TimeRepeatChecklistController {

    private final TimeRepeatChecklistRepository repository;

    public TimeRepeatChecklistController(TimeRepeatChecklistRepository repository) {
        this.repository = repository;
    }

    @GetMapping
    public List<TimeRepeatChecklist> findAll() {
        return repository.findAll();
    }

    @PostMapping
    public ResponseEntity<TimeRepeatChecklist> create(@RequestBody TimeRepeatChecklist body) {
        body.setId(null);
        TimeRepeatChecklist created = repository.save(body);
        return ResponseEntity.created(URI.create("/api/time-repeats/" + created.getId())).body(created);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        if (!repository.existsById(id)) return ResponseEntity.notFound().build();
        repository.deleteById(id);
        return ResponseEntity.noContent().build();
    }
}


