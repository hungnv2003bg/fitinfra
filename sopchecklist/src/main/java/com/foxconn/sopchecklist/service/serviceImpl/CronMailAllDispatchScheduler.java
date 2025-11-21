package com.foxconn.sopchecklist.service.serviceImpl;

import com.foxconn.sopchecklist.entity.TypeCronMail;
import com.foxconn.sopchecklist.repository.TypeCronMailRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.Map;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

/**
 * Scheduler để gửi mail từ bảng cron_mail_all
 * Hỗ trợ nhiều loại mail khác nhau (SIGNUP, SOP, CHECKLISTDONE, etc.)
 */
@Component
public class CronMailAllDispatchScheduler {

    private static final Logger log = LoggerFactory.getLogger(CronMailAllDispatchScheduler.class);

    // DB chính
    @Autowired
    @org.springframework.beans.factory.annotation.Qualifier("mainJdbcTemplate")
    private JdbcTemplate jdbcTemplate;

    // DB Mail_Test (chỉ để gọi SP gửi mail)
    @Autowired
    @org.springframework.beans.factory.annotation.Qualifier("mailJdbcTemplate")
    private JdbcTemplate mailJdbcTemplate;

    @Autowired
    private TypeCronMailRepository typeCronMailRepository;

    @Value("${mail.spExec:EXEC dbo.sp_MailWaiting_ITSystem_Insert @MailTo=?, @MailCC=?, @MailBCC=?, @Subject=?, @Body=?}")
    private String spExec;

    // Run every 5 minutes
    @Scheduled(fixedDelay = 300000)
    public void dispatchPendingMails() {
        dispatchOnce();
    }

    // Exposed for manual triggering/testing
    public String dispatchOnce() {
        int total = 0, sent = 0, failed = 0;
        try {
            // Get all pending mail from cron_mail_all with retry_count < 3
            List<Map<String, Object>> rows = jdbcTemplate.queryForList(
                "SELECT * FROM cron_mail_all WHERE status='PENDING' AND ISNULL(retry_count,0) < 3"
            );
            
            total = rows.size();
            if (total == 0) {
                return "total=0, sent=0, failed=0";
            }

            for (Map<String, Object> r : rows) {
                // Use Number.longValue() to be safe across drivers (Integer, BigDecimal, Long)
                Number idNum = (Number) r.get("id");
                Long id = idNum != null ? idNum.longValue() : null;
                String to = (String) r.get("mailto");
                String cc = (String) r.get("mailcc");
                String bcc = (String) r.get("mailbcc");
                String subject = (String) r.get("subject");
                String body = (String) r.get("body");
                Number typeNum = (Number) r.get("type_id");
                Long typeId = typeNum != null ? typeNum.longValue() : null;

                try {
                    // Validate required fields
                    if (to == null || to.trim().isEmpty()) {
                        jdbcTemplate.update(
                            "UPDATE cron_mail_all SET status='failed', retry_count = ISNULL(retry_count,0) + 1, last_error = 'Missing MailTo' WHERE id = ?",
                            id
                        );
                        failed++;
                        continue;
                    }
                    if (subject == null) subject = "";
                    if (body == null) body = "";
                    // to is already validated above, so it can't be null here
                    if (cc == null) cc = "";
                    if (bcc == null) bcc = "";

                    // Get type name for logging
                    String typeName = "UNKNOWN";
                    if (typeId != null) {
                        try {
                            TypeCronMail type = typeCronMailRepository.findById(typeId).orElse(null);
                            if (type != null) {
                                typeName = type.getTypeName();
                            }
                        } catch (Exception e) {
                            log.warn("Could not fetch type name for typeId: {}", typeId);
                        }
                    }
                    
                    // Truncate fields to prevent "String or binary data would be truncated" error
                    // Based on entity definition in CronMailAll:
                    // - mailto, mailcc, mailbcc: NVARCHAR(2000)
                    // - subject: NVARCHAR(2000)
                    // - body: NVARCHAR(MAX)
                    // Email addresses are stored as CSV (comma-separated), so we need to truncate to fit column size.
                    int originalToLen = to.length();
                    int originalCcLen = cc.length();
                    int originalBccLen = bcc.length();
                    int originalSubjectLen = subject.length();
                    int originalBodyLen = body.length();
                    
                    // Truncate to 2000 chars for email fields (matching entity definition NVARCHAR(2000))
                    // This supports ~80-100 email addresses (avg 20-25 chars each + commas)
                    int emailMaxLen = 2000;
                    if (to.length() > emailMaxLen) {
                        log.warn("Truncating MailTo from {} to max {} chars for mail id={}", originalToLen, emailMaxLen, id);
                        // Always truncate at a comma to avoid cutting email addresses in half
                        int lastComma = to.lastIndexOf(',', emailMaxLen);
                        if (lastComma > 0 && lastComma >= emailMaxLen - 100) {
                            // Only truncate at comma if it's within reasonable distance from maxLen
                            to = to.substring(0, lastComma);
                            log.warn("MailTo truncated to {} chars (at comma position {})", to.length(), lastComma);
                        } else {
                            // If no comma found nearby, truncate at maxLen
                            to = to.substring(0, emailMaxLen);
                            log.warn("MailTo truncated to {} chars (no comma found within range)", to.length());
                        }
                    }
                    // Final safety check: ensure it doesn't exceed 2000 (absolute max for NVARCHAR(2000))
                    if (to.length() > 2000) {
                        log.error("MailTo still exceeds 2000 chars after truncation: {}, forcing truncation", to.length());
                        int lastComma = to.lastIndexOf(',', 2000);
                        to = lastComma > 0 ? to.substring(0, lastComma) : to.substring(0, 2000);
                    }
                    if (cc.length() > emailMaxLen) {
                        log.warn("Truncating MailCC from {} to max {} chars for mail id={}", originalCcLen, emailMaxLen, id);
                        int lastComma = cc.lastIndexOf(',', emailMaxLen);
                        if (lastComma > 0 && lastComma >= emailMaxLen - 100) {
                            cc = cc.substring(0, lastComma);
                            log.warn("MailCC truncated to {} chars (at comma position {})", cc.length(), lastComma);
                        } else {
                            cc = cc.substring(0, emailMaxLen);
                            log.warn("MailCC truncated to {} chars (no comma found within range)", cc.length());
                        }
                    }
                    if (cc.length() > 2000) {
                        int lastComma = cc.lastIndexOf(',', 2000);
                        cc = lastComma > 0 ? cc.substring(0, lastComma) : cc.substring(0, 2000);
                    }
                    if (bcc.length() > emailMaxLen) {
                        log.warn("Truncating MailBCC from {} to max {} chars for mail id={}", originalBccLen, emailMaxLen, id);
                        int lastComma = bcc.lastIndexOf(',', emailMaxLen);
                        if (lastComma > 0 && lastComma >= emailMaxLen - 100) {
                            bcc = bcc.substring(0, lastComma);
                            log.warn("MailBCC truncated to {} chars (at comma position {})", bcc.length(), lastComma);
                        } else {
                            bcc = bcc.substring(0, emailMaxLen);
                            log.warn("MailBCC truncated to {} chars (no comma found within range)", bcc.length());
                        }
                    }
                    if (bcc.length() > 2000) {
                        int lastComma = bcc.lastIndexOf(',', 2000);
                        bcc = lastComma > 0 ? bcc.substring(0, lastComma) : bcc.substring(0, 2000);
                    }
                    // Truncate Subject to 2000 chars (matching entity definition NVARCHAR(2000))
                    int subjectMaxLen = 2000;
                    if (subject.length() > subjectMaxLen) {
                        log.warn("Truncating Subject from {} to {} chars for mail id={}", originalSubjectLen, subjectMaxLen, id);
                        subject = subject.substring(0, subjectMaxLen);
                    }
                    // Final safety check: ensure it doesn't exceed 2000
                    if (subject.length() > 2000) {
                        log.error("Subject still exceeds 2000 chars after truncation: {}, forcing truncation", subject.length());
                        subject = subject.substring(0, 2000);
                    }
                    // Body is NVARCHAR(MAX) in table, so no strict limit needed, but keep reasonable for email HTML
                    // Using 100000 chars as a safe limit (most email systems handle this size)
                    int bodyMaxLen = 100000;
                    if (body.length() > bodyMaxLen) {
                        log.warn("Truncating Body from {} to {} chars for mail id={}", originalBodyLen, bodyMaxLen, id);
                        body = body.substring(0, bodyMaxLen);
                    }
                    
                    // Final validation: ensure all fields are within safe limits before calling stored procedure
                    if (to.length() > 2000 || cc.length() > 2000 || bcc.length() > 2000 || subject.length() > 2000) {
                        log.error("CRITICAL: Field lengths exceed 2000 before SP call! id={}, toLen={}, ccLen={}, bccLen={}, subjectLen={}",
                            id, to.length(), cc.length(), bcc.length(), subject.length());
                        // Force truncate to 2000
                        if (to.length() > 2000) {
                            int lastComma = to.lastIndexOf(',', 2000);
                            to = lastComma > 0 ? to.substring(0, lastComma) : to.substring(0, 2000);
                        }
                        if (cc.length() > 2000) {
                            int lastComma = cc.lastIndexOf(',', 2000);
                            cc = lastComma > 0 ? cc.substring(0, lastComma) : cc.substring(0, 2000);
                        }
                        if (bcc.length() > 2000) {
                            int lastComma = bcc.lastIndexOf(',', 2000);
                            bcc = lastComma > 0 ? bcc.substring(0, lastComma) : bcc.substring(0, 2000);
                        }
                        if (subject.length() > 2000) {
                            subject = subject.substring(0, 2000);
                        }
                    }
                    
                    log.info("CronMailAllDispatch call: id={}, type={}, toLen={}, ccLen={}, bccLen={}, subjectLen={}, bodyLen={}",
                        id, typeName, to.length(), cc.length(), bcc.length(), subject.length(), body.length());
                    
                    // Log email count for debugging
                    int emailCount = to.isEmpty() ? 0 : to.split(",").length;
                    log.info("MailTo contains {} email addresses", emailCount);
                    
                    // Log first part of email list for debugging (avoid logging full list which may be long)
                    String toPreview = to.length() > 150 ? to.substring(0, 150) + "..." : to;
                    log.debug("MailTo preview (first 150 chars): {}", toPreview);

                    // Call stored procedure to send mail
                    try {
                        mailJdbcTemplate.update(spExec, to, cc, bcc, subject, body);
                        log.info("Stored procedure call succeeded for mail id={}", id);
                    } catch (Exception spEx) {
                        log.error("Stored procedure call failed for mail id={}. Field lengths: toLen={}, ccLen={}, bccLen={}, subjectLen={}, bodyLen={}",
                            id, to.length(), cc.length(), bcc.length(), subject.length(), body.length());
                        log.error("Error message: {}", spEx.getMessage());
                        throw spEx; // Re-throw to be caught by outer catch block
                    }
                    
                    // Update status in main DB
                    jdbcTemplate.update("UPDATE cron_mail_all SET status='sent', last_error=NULL WHERE id = ?", id);
                    sent++;
                } catch (Exception ex) {
                    // Mark as failed and increase retry count
                    jdbcTemplate.update(
                        "UPDATE cron_mail_all SET status='failed', retry_count = ISNULL(retry_count,0) + 1, last_error = LEFT(?, 1000) WHERE id = ?",
                        ex.getMessage(), id
                    );
                    failed++;
                    log.error("Failed to send cron_mail_all id={}: {}", id, ex.getMessage());
                }
            }
        } catch (Exception ex) {
            log.error("Error in dispatchPendingMails: {}", ex.getMessage());
            return "error=" + ex.getMessage();
        }
        return "total=" + total + ", sent=" + sent + ", failed=" + failed;
    }
}


