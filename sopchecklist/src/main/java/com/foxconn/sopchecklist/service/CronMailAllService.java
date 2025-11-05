package com.foxconn.sopchecklist.service;

import com.foxconn.sopchecklist.entity.CronMailAll;

import java.util.List;

public interface CronMailAllService {
    
    List<CronMailAll> listAll();
    
    List<CronMailAll> findByStatus(String status);
    
    List<CronMailAll> findByTypeIdAndStatus(Long typeId, String status);
    
    CronMailAll add(CronMailAll cronMailAll);
    
    CronMailAll update(Long id, CronMailAll cronMailAll);
    
    void delete(Long id);
    
    List<CronMailAll> findPendingMail();
    
    CronMailAll findById(Long id);
}

