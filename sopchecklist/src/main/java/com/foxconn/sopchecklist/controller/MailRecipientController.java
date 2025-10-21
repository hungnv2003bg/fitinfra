package com.foxconn.sopchecklist.controller;

import com.foxconn.sopchecklist.entity.MailRecipient;
import com.foxconn.sopchecklist.service.MailRecipientService;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/mail-recipients")
@CrossOrigin
public class MailRecipientController {

    private final MailRecipientService service;

    public MailRecipientController(MailRecipientService service) {
        this.service = service;
    }

    @GetMapping
    public List<MailRecipient> listAll() { return service.listAll(); }

    @GetMapping("/enabled")
    public List<MailRecipient> listEnabled() { return service.listEnabled(); }

    @PostMapping
    public MailRecipient add(@RequestBody MailRecipient r) { return service.add(r); }

    @PutMapping("/{id}")
    public MailRecipient update(@PathVariable Long id, @RequestBody MailRecipient r) { return service.update(id, r); }

    @DeleteMapping("/{id}")
    public void delete(@PathVariable Long id) { service.delete(id); }

    @PostMapping("/replace")
    public void replaceAll(@RequestParam(value = "to", required = false) String to,
                           @RequestParam(value = "cc", required = false) String cc,
                           @RequestParam(value = "bcc", required = false) String bcc) {
        service.replaceAll(to, cc, bcc);
    }
}


