package com.foxconn.sopchecklist.service.serviceImpl;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.sql.ResultSet;
import java.util.List;
import java.util.Map;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;


@Component
public class ChecklistMailDispatchScheduler {

    private static final Logger log = LoggerFactory.getLogger(ChecklistMailDispatchScheduler.class);

    @Autowired
    @org.springframework.beans.factory.annotation.Qualifier("mainJdbcTemplate")
    private JdbcTemplate jdbcTemplate;

  
    @Autowired
    @org.springframework.beans.factory.annotation.Qualifier("mailJdbcTemplate")
    private JdbcTemplate mailJdbcTemplate;

    @Value("${mail.spExec:EXEC dbo.sp_MailWaiting_ITSystem_Insert @MailTo=?, @MailCC=?, @MailBCC=?, @Subject=?, @Body=?}")
    private String spExec;


    @Scheduled(fixedDelay = 30000)
    public void dispatchPendingMails() { dispatchOnce(); }


    public String dispatchOnce() {
        int total = 0, sent = 0, failed = 0;
        try {
    
            List<Map<String, Object>> rows = jdbcTemplate.query(
                "SELECT TOP 50 id, mailto, mailcc, mailbcc, subject, body, ISNULL(retry_count,0) AS retry_count FROM cron_mail_checklist WHERE ISNULL(status,'pending') IN ('pending','failed') AND ISNULL(retry_count,0) < 5 ORDER BY id",
                (ResultSet rs, int rowNum) -> Map.of(
                    "id", rs.getLong("id"),
                    "mailto", rs.getString("mailto"),
                    "mailcc", rs.getString("mailcc"),
                    "mailbcc", rs.getString("mailbcc"),
                    "subject", rs.getString("subject"),
                    "body", rs.getString("body"),
                    "retry_count", rs.getInt("retry_count")
                )
            );
            total = rows.size();
            for (Map<String, Object> r : rows) {
                Long id = (Long) r.get("id");
                String to = (String) r.get("mailto");
                String cc = (String) r.get("mailcc");
                String bcc = (String) r.get("mailbcc");
                String subject = (String) r.get("subject");
                String body = (String) r.get("body");

                try {
                
                    if (to == null || to.trim().isEmpty()) {
                        jdbcTemplate.update(
                            "UPDATE cron_mail_checklist SET status='failed', retry_count = ISNULL(retry_count,0) + 1, last_error = 'Missing MailTo' WHERE id = ?",
                            id
                        );
                        failed++;
                        continue;
                    }
                    if (subject == null) subject = "";
                    if (body == null) body = "";

                    String bodyPreview = body.length() > 200 ? body.substring(0, 200) + "..." : body;
                    log.info("ChecklistMailDispatch call: id={}, to={}, cc={}, bcc={}, subjectLen={}, bodyLen={}, bodyPreview={}",
                        id, to, cc, bcc, subject.length(), body.length(), bodyPreview);

                    // Call existing stored procedure that actually sends mail
                    mailJdbcTemplate.update(spExec, to, cc, bcc, subject, body);
                    // Update status in main DB
                    jdbcTemplate.update("UPDATE cron_mail_checklist SET status='sent', last_error=NULL WHERE id = ?", id);
                    sent++;
                } catch (Exception ex) {
                    jdbcTemplate.update("UPDATE cron_mail_checklist SET status='failed', retry_count = ISNULL(retry_count,0) + 1, last_error = LEFT(?, 1000) WHERE id = ?",
                        ex.getMessage(), id);
                    failed++;
                }
            }
        } catch (Exception ex) { return "error=" + ex.getMessage(); }
        return "total=" + total + ", sent=" + sent + ", failed=" + failed;
    }
}