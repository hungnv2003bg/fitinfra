package com.foxconn.sopchecklist.repository;

import com.foxconn.sopchecklist.entity.CronMail;
import org.springframework.data.jpa.repository.JpaRepository;

public interface MailRepository extends JpaRepository<CronMail, Long> {
}


