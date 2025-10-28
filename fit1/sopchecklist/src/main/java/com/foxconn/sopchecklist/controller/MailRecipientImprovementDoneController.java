package com.foxconn.sopchecklist.controller;

import com.foxconn.sopchecklist.dto.MailRecipientDTO;
import com.foxconn.sopchecklist.entity.MailRecipientAll;
import com.foxconn.sopchecklist.service.MailRecipientAllService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/mail-recipients-improvement-done")
@CrossOrigin
public class MailRecipientImprovementDoneController {

    private final MailRecipientAllService service;

    public MailRecipientImprovementDoneController(MailRecipientAllService service) {
        this.service = service;
    }

    @GetMapping
    public ResponseEntity<List<MailRecipientDTO>> list() {
        List<MailRecipientAll> result = service.findByTypeMailRecipientTypeNameAndEnabledTrue("IMPROVEMENTDONE");
        return ResponseEntity.ok(result.stream().map(this::toDto).collect(Collectors.toList()));
    }

    @PostMapping("/replace")
    public ResponseEntity<Void> replace(@RequestParam(value = "to", required = false) String to,
                                        @RequestParam(value = "cc", required = false) String cc,
                                        @RequestParam(value = "bcc", required = false) String bcc) {
        service.replaceAllByEventType("IMPROVEMENTDONE", to, cc, bcc);
        return ResponseEntity.ok().build();
    }

    private MailRecipientDTO toDto(MailRecipientAll m) {
        MailRecipientDTO d = new MailRecipientDTO();
        d.setId(m.getId());
        d.setEmail(m.getEmail());
        d.setType(m.getType());
        d.setEnabled(m.getEnabled());
        d.setNote(m.getNote());
        d.setChecklistId(m.getChecklistId());
        return d;
    }
}


