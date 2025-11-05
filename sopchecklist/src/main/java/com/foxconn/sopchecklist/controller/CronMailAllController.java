package com.foxconn.sopchecklist.controller;

import com.foxconn.sopchecklist.entity.CronMailAll;
import com.foxconn.sopchecklist.service.CronMailAllService;
import com.foxconn.sopchecklist.service.serviceImpl.CronMailAllDispatchScheduler;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/cron-mail-all")
@CrossOrigin
public class CronMailAllController {

    private final CronMailAllService service;
    private final CronMailAllDispatchScheduler scheduler;

    public CronMailAllController(CronMailAllService service, CronMailAllDispatchScheduler scheduler) {
        this.service = service;
        this.scheduler = scheduler;
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
}

