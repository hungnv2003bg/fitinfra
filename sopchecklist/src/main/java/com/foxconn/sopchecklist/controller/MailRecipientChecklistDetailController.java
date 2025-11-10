package com.foxconn.sopchecklist.controller;

import com.foxconn.sopchecklist.entity.MailRecipientAll;
import com.foxconn.sopchecklist.service.MailRecipientAllService;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/mail-recipients-checklist-detail")
@CrossOrigin
public class MailRecipientChecklistDetailController {

    private final MailRecipientAllService service;

    public MailRecipientChecklistDetailController(MailRecipientAllService service) {
        this.service = service;
    }

    @GetMapping
    public List<MailRecipientAll> getChecklistDetailRecipients() {
        System.out.println("DEBUG: API called - getChecklistDetailRecipients");
        
        try {
            List<MailRecipientAll> result = service.findByTypeMailRecipientTypeNameAndEnabledTrue("CHECKLISTDONE");
            System.out.println("DEBUG: Found " + result.size() + " CHECKLISTDONE recipients");
            return result;
        } catch (Exception e) {
            System.err.println("ERROR in getChecklistDetailRecipients: " + e.getMessage());
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

    @PostMapping("/replace")
    public void replaceChecklistDetailRecipients(@RequestParam(value = "to", required = false) String to,
                                                @RequestParam(value = "cc", required = false) String cc,
                                                @RequestParam(value = "bcc", required = false) String bcc) {
        service.replaceAllByEventType("CHECKLISTDONE", to, cc, bcc);
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
