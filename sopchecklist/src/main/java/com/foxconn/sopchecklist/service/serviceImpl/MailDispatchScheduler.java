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
public class MailDispatchScheduler {

    private static final Logger log = LoggerFactory.getLogger(MailDispatchScheduler.class);

    // DB chính 10.222.48.77 (bảng cron_mail)
    @Autowired
    @org.springframework.beans.factory.annotation.Qualifier("mainJdbcTemplate")
    private JdbcTemplate jdbcTemplate;

    // DB Mail_Test 10.228.14.75 (chỉ để gọi SP gửi mail)
    @Autowired
    @org.springframework.beans.factory.annotation.Qualifier("mailJdbcTemplate")
    private JdbcTemplate mailJdbcTemplate;

    @Value("${mail.spExec:EXEC dbo.sp_MailWaiting_ITSystem_Insert @MailTo=?, @MailCC=?, @MailBCC=?, @Subject=?, @Body=?}")
    private String spExec;

    // Run every 30 seconds
    @Scheduled(fixedDelay = 30000)
    public void dispatchPendingMails() { dispatchOnce(); }

    // Exposed for manual triggering/testing
    public String dispatchOnce() {
        int total = 0, sent = 0, failed = 0;
        try {
            // Lấy mail pending/failed từ DB chính
            List<Map<String, Object>> rows = jdbcTemplate.query(
                "SELECT TOP 50 id, mailto, mailcc, mailbcc, subject, body, ISNULL(retry_count,0) AS retry_count FROM cron_mail WHERE ISNULL(status,'pending') IN ('pending','failed') AND ISNULL(retry_count,0) < 5 ORDER BY id",
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
                    // Validate required fields before calling SP (avoid hanging 'pending')
                    if (to == null || to.trim().isEmpty()) {
                        jdbcTemplate.update(
                            "UPDATE cron_mail SET status='failed', retry_count = ISNULL(retry_count,0) + 1, last_error = 'Missing MailTo' WHERE id = ?",
                            id
                        );
                        failed++;
                        continue;
                    }
                    if (subject == null) subject = "";
                    if (body == null) body = "";

                    // Debug log input before executing stored procedure (trim body to 200 chars)
                    String bodyPreview = body.length() > 200 ? body.substring(0, 200) + "..." : body;
                    log.info("MailDispatch call: id={}, to={}, cc={}, bcc={}, subjectLen={}, bodyLen={}, bodyPreview={}",
                        id, to, cc, bcc, subject.length(), body.length(), bodyPreview);

                    // Call your existing stored procedure that actually sends mail
                    mailJdbcTemplate.update(spExec, to, cc, bcc, subject, body);
                    // Cập nhật trạng thái ở DB chính
                    jdbcTemplate.update("UPDATE cron_mail SET status='sent', last_error=NULL WHERE id = ?", id);
                    sent++;
                } catch (Exception ex) {
                    // Đánh dấu failed và tăng retry ở DB chính
                    jdbcTemplate.update("UPDATE cron_mail SET status='failed', retry_count = ISNULL(retry_count,0) + 1, last_error = LEFT(?, 1000) WHERE id = ?",
                        ex.getMessage(), id);
                    failed++;
                }
            }
        } catch (Exception ex) { return "error=" + ex.getMessage(); }
        return "total=" + total + ", sent=" + sent + ", failed=" + failed;
    }

    public String diagnostics() {
        try {
            String procCheck = mailJdbcTemplate.queryForObject("SELECT TOP 1 name FROM sys.procedures WHERE name = 'sp_MailWaiting_ITSystem_Insert'", String.class);
            String mainDb = jdbcTemplate.queryForObject("SELECT DB_NAME()", String.class);
            String mainServer = jdbcTemplate.queryForObject("SELECT CAST(@@SERVERNAME AS NVARCHAR(128))", String.class);
            String mailDb = mailJdbcTemplate.queryForObject("SELECT DB_NAME()", String.class);
            String mailServer = mailJdbcTemplate.queryForObject("SELECT CAST(@@SERVERNAME AS NVARCHAR(128))", String.class);

            // Không query trực tiếp bảng cron_mail để tránh lỗi; kiểm tra qua sys.tables
            Integer tblByDefault = jdbcTemplate.queryForObject("SELECT COUNT(1) FROM sys.tables WHERE name = 'cron_mail'", Integer.class);
            Integer tblByDbo = jdbcTemplate.queryForObject("SELECT COUNT(1) FROM sys.tables WHERE SCHEMA_NAME(schema_id) = 'dbo' AND name = 'cron_mail'", Integer.class);

            return "mainDb=" + mainDb + ", mainServer=" + mainServer +
                ", mailDb=" + mailDb + ", mailServer=" + mailServer +
                ", proc=" + procCheck + ", tableExistsDefaultSchema=" + tblByDefault + ", tableExistsDbo=" + tblByDbo;
        } catch (Exception ex) {
            return "diag-error=" + ex.getMessage();
        }
    }
}



