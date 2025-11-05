package com.foxconn.sopchecklist.controller;

import com.foxconn.sopchecklist.entity.ImprovementProgress;
import com.foxconn.sopchecklist.service.ImprovementProgressService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.net.URI;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api")
@CrossOrigin
public class ImprovementProgressController {

    private final ImprovementProgressService progressService;

    public ImprovementProgressController(ImprovementProgressService progressService) {
        this.progressService = progressService;
    }

    // List progress entries for an improvement
    @GetMapping("/improvements/{improvementId}/progress")
    public List<ImprovementProgress> list(@PathVariable Integer improvementId) {
        return progressService.listByImprovement(improvementId);
    }

    // Create a new progress entry
    @PostMapping("/improvements/{improvementId}/progress")
    public ResponseEntity<ImprovementProgress> create(@PathVariable Integer improvementId,
                                                      @RequestBody Map<String, Object> body) {
        Integer percent = body.get("percent") == null ? null : ((Number) body.get("percent")).intValue();
        String detail = body.get("detail") == null ? null : body.get("detail").toString();
        Integer status = body.get("status") == null ? null : ((Number) body.get("status")).intValue();
        Integer createdBy = body.get("createdBy") == null ? null : ((Number) body.get("createdBy")).intValue();
        ImprovementProgress created = progressService.create(improvementId, percent, detail, status, createdBy);
        return ResponseEntity.created(URI.create("/api/improvement-progress/" + created.getId())).body(created);
    }

    // Update a progress entry
    @PatchMapping("/improvement-progress/{progressId}")
    public ImprovementProgress update(@PathVariable Long progressId, @RequestBody Map<String, Object> body) {
        Integer percent = body.get("percent") == null ? null : ((Number) body.get("percent")).intValue();
        String detail = body.get("detail") == null ? null : body.get("detail").toString();
        Integer status = body.get("status") == null ? null : ((Number) body.get("status")).intValue();
        Integer updatedBy = body.get("updatedBy") == null ? null : ((Number) body.get("updatedBy")).intValue();
        return progressService.update(progressId, percent, detail, status, updatedBy);
    }

    // Delete a progress entry
    @DeleteMapping("/improvement-progress/{progressId}")
    public ResponseEntity<Void> delete(@PathVariable Long progressId) {
        progressService.delete(progressId);
        return ResponseEntity.noContent().build();
    }
}


