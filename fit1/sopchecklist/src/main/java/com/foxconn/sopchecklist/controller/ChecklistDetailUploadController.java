package com.foxconn.sopchecklist.controller;

import com.foxconn.sopchecklist.service.ChecklistDetailFileStorageService;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

// removed unused imports after dropping local download endpoint
import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/checklist-upload")
@CrossOrigin
public class ChecklistDetailUploadController {

    // logger kept for potential future debug of uploads
    
    private final ChecklistDetailFileStorageService storageService;
    
    @Value("${file.upload-dir:uploads}")
    private String uploadDir;

    public ChecklistDetailUploadController(ChecklistDetailFileStorageService storageService) {
        this.storageService = storageService;
    }

    @PostMapping
    public ResponseEntity<?> upload(@RequestParam("file") MultipartFile file,
                                    @RequestParam(value = "sopName", required = false) String sopName,
                                    @RequestParam(value = "sopDocumentName", required = false) String sopDocumentName) {
        try {
            String preferredFolder = (sopDocumentName != null && !sopDocumentName.isEmpty())
                    ? sopDocumentName
                    : sopName;
            String url = storageService.storeInFolder(file, preferredFolder);
            Map<String, Object> body = new HashMap<>();
            body.put("url", url);
            body.put("name", file.getOriginalFilename());
            
            return ResponseEntity.ok(body);
        } catch (Exception e) {
            Map<String, Object> err = new HashMap<>();
            err.put("error", e.getMessage());
            return ResponseEntity.badRequest().body(err);
        }
    }

    @GetMapping("/test")
    public ResponseEntity<String> test() {
        return ResponseEntity.ok("ChecklistDetail Upload Backend is running!");
    }

    // Removed legacy local download endpoint; /files/** serves files via FTP in FilesController
}
