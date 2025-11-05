package com.foxconn.sopchecklist.repository;

import com.foxconn.sopchecklist.entity.MailRecipientAll;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface MailRecipientRepository extends JpaRepository<MailRecipientAll, Long> {
    List<MailRecipientAll> findByEnabledTrue();
    List<MailRecipientAll> findByTypeAndEnabledTrue(String type);
    boolean existsByEmailIgnoreCaseAndType(String email, String type);
}


