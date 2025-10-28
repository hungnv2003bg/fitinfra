package com.foxconn.sopchecklist.controller;

import com.foxconn.sopchecklist.entity.Group;
import com.foxconn.sopchecklist.service.GroupService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.net.URI;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/groups")
@CrossOrigin
public class GroupsController {

    private final GroupService service;

    public GroupsController(GroupService service) {
        this.service = service;
    }

    @GetMapping
    public List<Group> findAll() {
        return service.findAll();
    }

    @GetMapping("/{id}")
    public ResponseEntity<Group> findOne(@PathVariable Long id) {
        Group group = service.findById(id);
        if (group == null) return ResponseEntity.notFound().build();
        return ResponseEntity.ok(group);
    }

    @PostMapping
    public ResponseEntity<?> create(@RequestBody Group body) {
        try {
            Group created = service.create(body);
            return ResponseEntity.created(URI.create("/api/groups/" + created.getId())).body(created);
        } catch (GroupService.DuplicateNameException e) {
            Map<String, Object> err = new HashMap<>();
            err.put("error", "DUPLICATE_NAME");
            err.put("duplicateValue", e.getDuplicateValue());
            return ResponseEntity.badRequest().body(err);
        } catch (IllegalArgumentException iae) {
            Map<String, Object> err = new HashMap<>();
            err.put("error", "VALIDATION");
            err.put("message", iae.getMessage());
            return ResponseEntity.badRequest().body(err);
        }
    }

    @PutMapping("/{id}")
    public ResponseEntity<?> update(@PathVariable Long id, @RequestBody Group body) {
        try {
            Group updated = service.update(id, body);
            if (updated == null) return ResponseEntity.notFound().build();
            return ResponseEntity.ok(updated);
        } catch (GroupService.DuplicateNameException e) {
            Map<String, Object> err = new HashMap<>();
            err.put("error", "DUPLICATE_NAME");
            err.put("duplicateValue", e.getDuplicateValue());
            return ResponseEntity.badRequest().body(err);
        } catch (IllegalArgumentException iae) {
            Map<String, Object> err = new HashMap<>();
            err.put("error", "VALIDATION");
            err.put("message", iae.getMessage());
            return ResponseEntity.badRequest().body(err);
        }
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        service.delete(id);
        return ResponseEntity.noContent().build();
    }
}



