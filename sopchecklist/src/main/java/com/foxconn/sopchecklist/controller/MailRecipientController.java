package com.foxconn.sopchecklist.controller;

import com.foxconn.sopchecklist.entity.MailRecipientAll;
import com.foxconn.sopchecklist.service.MailRecipientAllService;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/mail-recipients")
@CrossOrigin
public class MailRecipientController {

    private final MailRecipientAllService service;

    public MailRecipientController(MailRecipientAllService service) {
        this.service = service;
    }

    @GetMapping
    public List<MailRecipientAll> listAll() { 
        try {
            System.out.println("DEBUG: MailRecipientController.listAll() called");
            List<MailRecipientAll> result = service.listAll();
            System.out.println("DEBUG: Found " + result.size() + " recipients");
            return result;
        } catch (Exception e) {
            System.err.println("ERROR in MailRecipientController.listAll(): " + e.getMessage());
            e.printStackTrace();
            throw e;
        }
    }

    @GetMapping("/enabled")
    public List<MailRecipientAll> listEnabled() { return service.listEnabled(); }

    @PostMapping
    public MailRecipientAll add(@RequestBody MailRecipientAll r) { return service.add(r); }

    @PutMapping("/{id}")
    public MailRecipientAll update(@PathVariable Long id, @RequestBody MailRecipientAll r) { return service.update(id, r); }

    @DeleteMapping("/{id}")
    public void delete(@PathVariable Long id) { service.delete(id); }

    @PostMapping("/replace")
    public void replaceAll(@RequestParam(value = "to", required = false) String to,
                           @RequestParam(value = "cc", required = false) String cc,
                           @RequestParam(value = "bcc", required = false) String bcc) {
        service.replaceAll(to, cc, bcc);
    }

    @PostMapping("/replace-by-event")
    public void replaceAllByEventType(@RequestParam(value = "eventType", required = true) String eventType,
                                      @RequestParam(value = "to", required = false) String to,
                                      @RequestParam(value = "cc", required = false) String cc,
                                      @RequestParam(value = "bcc", required = false) String bcc) {
        service.replaceAllByEventType(eventType, to, cc, bcc);
    }

    @GetMapping("/by-event")
    public List<MailRecipientAll> listByEvent(@RequestParam("eventType") String eventType) {
        return service.findByTypeMailRecipientTypeNameAndEnabledTrue(eventType);
    }
}


