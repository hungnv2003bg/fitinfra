package com.foxconn.sopchecklist.controller;

import com.foxconn.sopchecklist.service.TimeService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/api")
@CrossOrigin
public class TimeController {

    private final TimeService timeService;

    public TimeController(TimeService timeService) {
        this.timeService = timeService;
    }

    
    @GetMapping("/server-time")
    public ResponseEntity<Map<String, Object>> getServerTime() {
        try {
            LocalDateTime serverTime = timeService.nowVietnam();
            
            Map<String, Object> response = new HashMap<>();
            response.put("serverTime", serverTime);
            response.put("serverTimeISO", serverTime.format(DateTimeFormatter.ISO_LOCAL_DATE_TIME));
            response.put("timezone", "Asia/Ho_Chi_Minh");
            response.put("timestamp", System.currentTimeMillis());
            
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            Map<String, Object> error = new HashMap<>();
            error.put("error", "Failed to get server time: " + e.getMessage());
            return ResponseEntity.internalServerError().body(error);
        }
    }
}

