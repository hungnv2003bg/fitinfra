package com.foxconn.sopchecklist.repository;

import com.foxconn.sopchecklist.entity.CronMailAll;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface CronMailAllRepository extends JpaRepository<CronMailAll, Long> {
    
    List<CronMailAll> findByStatus(String status);
    
    List<CronMailAll> findByTypeIdAndStatus(Long typeId, String status);
    
    List<CronMailAll> findByStatusAndRetryCountLessThan(String status, Integer retryCount);
}

