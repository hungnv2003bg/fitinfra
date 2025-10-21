package com.foxconn.sopchecklist.controller;

import com.foxconn.sopchecklist.service.serviceImpl.MailDispatchScheduler;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/mail")
public class MailDebugController {

    private final MailDispatchScheduler scheduler;

    public MailDebugController(MailDispatchScheduler scheduler) {
        this.scheduler = scheduler;
    }

    @GetMapping("/dispatch-once")
    public String dispatchOnce() { return scheduler.dispatchOnce(); }

    @GetMapping("/diagnostics")
    public String diagnostics() {
        return scheduler.diagnostics();
    }
}


