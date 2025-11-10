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
                    
                    log.info("CronMailAllDispatch call: id={}, type={}, to={}, cc={}, bcc={}, subjectLen={}, bodyLen={}",
                        id, typeName, to, cc, bcc, subject.length(), body.length());

                    // Call stored procedure to send mail
                    mailJdbcTemplate.update(spExec, to, cc, bcc, subject, body);
                    
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

