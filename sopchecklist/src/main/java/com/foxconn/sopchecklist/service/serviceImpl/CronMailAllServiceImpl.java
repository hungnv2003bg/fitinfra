package com.foxconn.sopchecklist.service.serviceImpl;

import com.foxconn.sopchecklist.entity.CronMailAll;
import com.foxconn.sopchecklist.repository.CronMailAllRepository;
import com.foxconn.sopchecklist.service.CronMailAllService;
import com.foxconn.sopchecklist.service.TimeService;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class CronMailAllServiceImpl implements CronMailAllService {

    private final CronMailAllRepository repository;
    private final TimeService timeService;

    public CronMailAllServiceImpl(CronMailAllRepository repository, TimeService timeService) {
        this.repository = repository;
        this.timeService = timeService;
    }

    @Override
    public List<CronMailAll> listAll() {
        return repository.findAll();
    }

    @Override
    public List<CronMailAll> findByStatus(String status) {
        return repository.findByStatus(status);
    }

    @Override
    public List<CronMailAll> findByTypeIdAndStatus(Long typeId, String status) {
        return repository.findByTypeIdAndStatus(typeId, status);
    }

    @Override
    public CronMailAll add(CronMailAll cronMailAll) {
        if (cronMailAll.getCreatedAt() == null) {
            cronMailAll.setCreatedAt(timeService.nowVietnam());
        }
        if (cronMailAll.getStatus() == null) {
            cronMailAll.setStatus("PENDING");
        }
        if (cronMailAll.getRetryCount() == null) {
            cronMailAll.setRetryCount(0);
        }
        return repository.save(cronMailAll);
    }

    @Override
    public CronMailAll update(Long id, CronMailAll cronMailAll) {
        CronMailAll existing = repository.findById(id).orElseThrow(() -> new IllegalArgumentException("Not found"));
        existing.setMailTo(cronMailAll.getMailTo());
        existing.setMailCC(cronMailAll.getMailCC());
        existing.setMailBCC(cronMailAll.getMailBCC());
        existing.setSubject(cronMailAll.getSubject());
        existing.setBody(cronMailAll.getBody());
        existing.setStatus(cronMailAll.getStatus());
        existing.setRetryCount(cronMailAll.getRetryCount());
        existing.setLastError(cronMailAll.getLastError());
        return repository.save(existing);
    }

    @Override
    public void delete(Long id) {
        repository.deleteById(id);
    }

    @Override
    public List<CronMailAll> findPendingMail() {
        return repository.findByStatusAndRetryCountLessThan("PENDING", 3);
    }

    @Override
    public CronMailAll findById(Long id) {
        return repository.findById(id).orElseThrow(() -> new IllegalArgumentException("Not found"));
    }
}

