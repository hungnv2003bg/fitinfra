package com.foxconn.sopchecklist.repository;

import com.foxconn.sopchecklist.entity.MailRecipient;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface MailRecipientRepository extends JpaRepository<MailRecipient, Long> {
    List<MailRecipient> findByEnabledTrue();
    List<MailRecipient> findByTypeAndEnabledTrue(String type);
    boolean existsByEmailIgnoreCaseAndType(String email, String type);
}


