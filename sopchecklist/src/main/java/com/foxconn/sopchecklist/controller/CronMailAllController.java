package com.foxconn.sopchecklist.controller;

import com.foxconn.sopchecklist.entity.CronMailAll;
import com.foxconn.sopchecklist.service.CronMailAllService;
import com.foxconn.sopchecklist.service.CronMailAllSendService;
import com.foxconn.sopchecklist.service.serviceImpl.CronMailAllDispatchScheduler;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/cron-mail-all")
@CrossOrigin
public class CronMailAllController {

    private final CronMailAllService service;
    private final CronMailAllDispatchScheduler scheduler;
    private final CronMailAllSendService sendService;

    public CronMailAllController(CronMailAllService service, CronMailAllDispatchScheduler scheduler, CronMailAllSendService sendService) {
        this.service = service;
        this.scheduler = scheduler;
        this.sendService = sendService;
    }

    @GetMapping
    public List<CronMailAll> listAll() {
        return service.listAll();
    }

    @GetMapping("/status/{status}")
    public List<CronMailAll> findByStatus(@PathVariable String status) {
        return service.findByStatus(status);
    }

    @GetMapping("/type/{typeId}/status/{status}")
    public List<CronMailAll> findByTypeIdAndStatus(@PathVariable Long typeId, @PathVariable String status) {
        return service.findByTypeIdAndStatus(typeId, status);
    }

    @GetMapping("/pending")
    public List<CronMailAll> findPendingMail() {
        return service.findPendingMail();
    }

    @GetMapping("/{id}")
    public CronMailAll findById(@PathVariable Long id) {
        return service.findById(id);
    }

    @PostMapping
    public CronMailAll add(@RequestBody CronMailAll cronMailAll) {
        return service.add(cronMailAll);
    }

    @PutMapping("/{id}")
    public CronMailAll update(@PathVariable Long id, @RequestBody CronMailAll cronMailAll) {
        return service.update(id, cronMailAll);
    }

    @DeleteMapping("/{id}")
    public void delete(@PathVariable Long id) {
        service.delete(id);
    }

    @GetMapping("/dispatch")
    public String dispatchNow() {
        return scheduler.dispatchOnce();
    }

    /**
     * Test endpoint: Tạo mail với danh sách email dài và trigger gửi ngay
     * POST /api/cron-mail-all/test-send
     * Body: {
     *   "mailTo": "email1@example.com,email2@example.com,...",
     *   "subject": "Test subject",
     *   "body": "Test body"
     * }
     */
    @PostMapping("/test-send")
    public Map<String, Object> testSendMail(@RequestBody Map<String, String> request) {
        Map<String, Object> result = new HashMap<>();
        try {
            String mailTo = request.getOrDefault("mailTo", "");
            String subject = request.getOrDefault("subject", "Test Email");
            String body = request.getOrDefault("body", "<html><body><h1>Test Email Body</h1></body></html>");
            
            result.put("mailToLength", mailTo.length());
            result.put("subjectLength", subject.length());
            result.put("bodyLength", body.length());
            result.put("emailCount", mailTo.isEmpty() ? 0 : mailTo.split(",").length);
            
            // Tạo mail record
            CronMailAll mail = sendService.sendMailCustom(
                "TEST",
                mailTo,
                null, // CC
                null, // BCC
                subject,
                body,
                null // referenceId
            );
            
            if (mail != null) {
                result.put("mailId", mail.getId());
                result.put("status", "created");
                result.put("message", "Mail record created successfully. Use /dispatch to send it.");
            } else {
                result.put("status", "failed");
                result.put("message", "Failed to create mail record");
            }
        } catch (Exception e) {
            result.put("status", "error");
            result.put("message", e.getMessage());
            result.put("error", e.getClass().getSimpleName());
        }
        return result;
    }
}

