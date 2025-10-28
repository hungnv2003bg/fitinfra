package com.foxconn.sopchecklist.controller;

import com.foxconn.sopchecklist.entity.MailRecipientAll;
import com.foxconn.sopchecklist.service.MailRecipientAllService;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/mail-recipients-signup")
@CrossOrigin
public class MailRecipientSignupController {

    private final MailRecipientAllService service;

    public MailRecipientSignupController(MailRecipientAllService service) {
        this.service = service;
    }

    @GetMapping
    public List<MailRecipientAll> getSignupRecipients() {
        System.out.println("DEBUG: API called - getSignupRecipients");
        
        try {
            // Return recipients filtered by SIGNUP type
            List<MailRecipientAll> result = service.findByTypeMailRecipientTypeNameAndEnabledTrue("SIGNUP");
            System.out.println("DEBUG: Found " + result.size() + " SIGNUP recipients");
            return result;
        } catch (Exception e) {
            System.err.println("ERROR in getSignupRecipients: " + e.getMessage());
            e.printStackTrace();
            return java.util.Collections.emptyList();
        }
    }

    @GetMapping("/debug")
    public Object debugAllData() {
        List<MailRecipientAll> allRecipients = service.listAll();
        System.out.println("DEBUG: Total recipients in database: " + allRecipients.size());
        for (MailRecipientAll recipient : allRecipients) {
            System.out.println("DEBUG: ID=" + recipient.getId() + 
                             ", Email=" + recipient.getEmail() + 
                             ", Type=" + recipient.getType() + 
                             ", Enabled=" + recipient.getEnabled() + 
                             ", TypeMailRecipient=" + (recipient.getTypeMailRecipient() != null ? recipient.getTypeMailRecipient().getTypeName() : "NULL"));
        }
        return allRecipients;
    }

    @GetMapping("/test")
    public Object testQuery() {
        // Test direct query
        List<MailRecipientAll> result = service.findByTypeMailRecipientTypeNameAndEnabledTrue("SIGNUP");
        System.out.println("TEST: Direct query returned " + result.size() + " results");
        return result;
    }

    @PostMapping("/replace")
    public void replaceSignupRecipients(@RequestParam(value = "to", required = false) String to,
                                        @RequestParam(value = "cc", required = false) String cc,
                                        @RequestParam(value = "bcc", required = false) String bcc) {
        // Replace all mail recipients for SIGNUP type
        service.replaceAllByEventType("SIGNUP", to, cc, bcc);
    }

    @PostMapping
    public MailRecipientAll add(@RequestBody MailRecipientAll r) {
        return service.add(r);
    }

    @PutMapping("/{id}")
    public MailRecipientAll update(@PathVariable Long id, @RequestBody MailRecipientAll r) {
        return service.update(id, r);
    }

    @DeleteMapping("/{id}")
    public void delete(@PathVariable Long id) {
        service.delete(id);
    }
}

