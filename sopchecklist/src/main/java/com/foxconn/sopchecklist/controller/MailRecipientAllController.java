package com.foxconn.sopchecklist.controller;

import com.foxconn.sopchecklist.entity.MailRecipientAll;
import com.foxconn.sopchecklist.service.MailRecipientAllService;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/mail-recipients-all")
@CrossOrigin
public class MailRecipientAllController {

    private final MailRecipientAllService service;

    public MailRecipientAllController(MailRecipientAllService service) {
        this.service = service;
    }

    @GetMapping
    public List<MailRecipientAll> listAll() { return service.listAll(); }

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

    @GetMapping("/recipients")
    public List<MailRecipientAll> getRecipients() {
        return service.listEnabled();
    }
}
