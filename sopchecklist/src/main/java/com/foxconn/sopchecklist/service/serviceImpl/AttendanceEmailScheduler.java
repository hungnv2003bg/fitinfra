package com.foxconn.sopchecklist.service.serviceImpl;

import com.foxconn.sopchecklist.entity.CronMailAll;
import com.foxconn.sopchecklist.entity.MailRecipientAll;
import com.foxconn.sopchecklist.service.AttendanceEmailService;
import com.foxconn.sopchecklist.service.CronMailAllSendService;
import com.foxconn.sopchecklist.service.MailRecipientAllService;
import com.foxconn.sopchecklist.service.TimeService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;
import java.util.stream.Collectors;

/**
 * Scheduler để gửi email báo cáo điểm danh hàng ngày
 * - 8:30 AM: Luôn gửi email
 * - 1:30 PM: Chỉ gửi nếu có thay đổi so với lần gửi trước
 * Gửi tới:
 * 1. Người thông báo nhận mail từ system settings (ATTENDANCE type)
 * 2. Tất cả nhân viên trong danh sách theo dõi
 */
@Component
public class AttendanceEmailScheduler {

    private static final Logger log = LoggerFactory.getLogger(AttendanceEmailScheduler.class);
    
    // Cache để lưu stats của lần gửi cuối cùng theo ngày
    private final Map<LocalDate, AttendanceEmailService.AttendanceStats> lastSentStatsCache = new ConcurrentHashMap<>();

    @Autowired
    private AttendanceEmailService attendanceEmailService;

    @Autowired
    private CronMailAllSendService cronMailAllSendService;

    @Autowired
    private MailRecipientAllService mailRecipientAllService;

    @Autowired(required = false)
    private TimeService timeService;

    /**
     * Chạy mỗi ngày lúc 8:30 AM theo giờ Việt Nam
     * Luôn gửi email bất kể có thay đổi hay không
     * Cron expression: "0 30 8 * * ?" = giây phút giờ ngày tháng thứ
     */
    @Scheduled(cron = "0 30 8 * * ?", zone = "Asia/Ho_Chi_Minh")
    @Transactional
    public void sendDailyAttendanceEmail() {
        LocalDate today = getToday();
        log.info("=== AttendanceEmailScheduler: Starting daily attendance email (8:30 AM) for date: {} ===", today);

        try {
            // Tính attendance stats cho ngày hiện tại
            AttendanceEmailService.AttendanceStats stats = attendanceEmailService.calculateAttendanceStats(today);
            log.info("Calculated attendance stats: Overall rate: {}%, Total employees: {}", 
                stats.overallRate, stats.totalEmployees);

            // Gửi email
            sendAttendanceEmail(today, stats);

            // Lưu stats vào cache sau khi gửi thành công
            lastSentStatsCache.put(today, stats);
            log.info("Saved stats to cache for date: {}", today);

        } catch (Exception e) {
            log.error("Error in AttendanceEmailScheduler (8:30 AM): ", e);
        }
    }

    /**
     * Chạy mỗi ngày lúc 1:30 PM theo giờ Việt Nam
     * Chỉ gửi email nếu có thay đổi so với lần gửi trước (8:30 AM)
     * Cron expression: "0 30 13 * * ?" = giây phút giờ ngày tháng thứ
     */
    @Scheduled(cron = "0 30 13 * * ?", zone = "Asia/Ho_Chi_Minh")
    @Transactional
    public void sendAfternoonAttendanceEmailIfChanged() {
        LocalDate today = getToday();
        log.info("=== AttendanceEmailScheduler: Checking for changes (1:30 PM) for date: {} ===", today);

        try {
            // Tính attendance stats cho ngày hiện tại
            AttendanceEmailService.AttendanceStats currentStats = attendanceEmailService.calculateAttendanceStats(today);
            log.info("Calculated current attendance stats: Overall rate: {}%, Total employees: {}", 
                currentStats.overallRate, currentStats.totalEmployees);

            // Lấy stats của lần gửi trước (8:30 AM)
            AttendanceEmailService.AttendanceStats lastStats = lastSentStatsCache.get(today);

            if (lastStats == null) {
                log.info("No previous stats found for date: {}, sending email anyway", today);
                sendAttendanceEmail(today, currentStats);
                lastSentStatsCache.put(today, currentStats);
            } else {
                // So sánh stats hiện tại với stats lần trước
                if (hasStatsChanged(currentStats, lastStats)) {
                    log.info("Stats changed detected! Sending email at 1:30 PM");
                    sendAttendanceEmail(today, currentStats);
                    lastSentStatsCache.put(today, currentStats);
                } else {
                    log.info("No changes detected, skipping email at 1:30 PM");
                }
            }

        } catch (Exception e) {
            log.error("Error in AttendanceEmailScheduler (1:30 PM): ", e);
        }
    }

    /**
     * Gửi email attendance
     */
    private void sendAttendanceEmail(LocalDate date, AttendanceEmailService.AttendanceStats stats) {
        // Tạo HTML email
        String emailHtml = attendanceEmailService.createAttendanceEmailHtml(date, stats);

        // Tạo subject
        DateTimeFormatter formatter = DateTimeFormatter.ofPattern("dd/MM/yyyy");
        String subject = "Thông báo nhân viên IT đi làm / IT员工出勤通知: " + date.format(formatter);

        // Lấy email recipients từ system settings (ATTENDANCE type)
        RecipientGroups recipientGroups = getSystemRecipients();
        log.info("System recipients - TO: {}, CC: {}, BCC: {}",
            recipientGroups.to.size(), recipientGroups.cc.size(), recipientGroups.bcc.size());

        // Lấy email của tất cả employees trong tracking list
        List<String> trackingListEmails = attendanceEmailService.getTrackingListEmails();
        log.info("Found {} employees in tracking list", trackingListEmails.size());

        // Kết hợp tất cả email TO (loại bỏ trùng lặp)
        Set<String> toRecipients = new LinkedHashSet<>(recipientGroups.to);
        toRecipients.addAll(trackingListEmails);

        if (toRecipients.isEmpty() && recipientGroups.cc.isEmpty() && recipientGroups.bcc.isEmpty()) {
            log.warn("No recipients found, skipping email send");
            return;
        }

        String toCsv = String.join(",", toRecipients);
        String ccCsv = String.join(",", recipientGroups.cc);
        String bccCsv = String.join(",", recipientGroups.bcc);

        log.info("Sending attendance email - TO: {}, CC: {}, BCC: {}",
            toRecipients.size(), recipientGroups.cc.size(), recipientGroups.bcc.size());

        // Gửi email
        CronMailAll mail = cronMailAllSendService.sendMailCustom(
            "ATTENDANCE",
            toCsv,
            ccCsv.isEmpty() ? null : ccCsv,
            bccCsv.isEmpty() ? null : bccCsv,
            subject,
            emailHtml,
            null // referenceId
        );

        if (mail != null) {
            log.info("=== AttendanceEmailScheduler: Email sent successfully. Mail ID: {} ===", mail.getId());
        } else {
            log.error("=== AttendanceEmailScheduler: Failed to send email ===");
        }
    }

    /**
     * So sánh hai stats để xem có thay đổi không
     */
    private boolean hasStatsChanged(AttendanceEmailService.AttendanceStats current, 
                                    AttendanceEmailService.AttendanceStats previous) {
        // So sánh các giá trị chính
        if (current.totalEmployees != previous.totalEmployees ||
            current.present != previous.present ||
            current.halfDay != previous.halfDay ||
            current.absent != previous.absent ||
            current.leave != previous.leave ||
            current.weekendLeave != previous.weekendLeave ||
            current.overallRate != previous.overallRate) {
            return true;
        }

        // So sánh group stats
        if (current.groupStats.size() != previous.groupStats.size()) {
            return true;
        }

        // So sánh từng group
        Map<String, AttendanceEmailService.GroupStats> previousGroupMap = previous.groupStats.stream()
            .collect(Collectors.toMap(gs -> gs.name, gs -> gs));

        for (AttendanceEmailService.GroupStats currentGroup : current.groupStats) {
            AttendanceEmailService.GroupStats previousGroup = previousGroupMap.get(currentGroup.name);
            
            if (previousGroup == null) {
                return true; // Có group mới
            }

            if (currentGroup.totalEmployees != previousGroup.totalEmployees ||
                currentGroup.present != previousGroup.present ||
                currentGroup.halfDay != previousGroup.halfDay ||
                currentGroup.absent != previousGroup.absent ||
                currentGroup.leave != previousGroup.leave ||
                currentGroup.weekendLeave != previousGroup.weekendLeave ||
                currentGroup.rate != previousGroup.rate) {
                return true; // Có thay đổi trong group
            }
        }

        return false; // Không có thay đổi
    }

    /**
     * Lấy danh sách email recipients từ system settings (ATTENDANCE type)
     */
    private RecipientGroups getSystemRecipients() {
        RecipientGroups groups = new RecipientGroups();
        try {
            List<MailRecipientAll> recipients = mailRecipientAllService
                .findByTypeMailRecipientTypeNameAndEnabledTrue("ATTENDANCE");

            for (MailRecipientAll recipient : recipients) {
                if (recipient == null) continue;
                String email = recipient.getEmail();
                if (email == null || email.trim().isEmpty()) continue;
                String trimmed = email.trim();

                String type = recipient.getType();
                if (type == null || type.trim().isEmpty()) {
                    groups.to.add(trimmed);
                    continue;
                }

                switch (type.trim().toUpperCase()) {
                    case "CC":
                        groups.cc.add(trimmed);
                        break;
                    case "BCC":
                        groups.bcc.add(trimmed);
                        break;
                    default:
                        groups.to.add(trimmed);
                        break;
                }
            }
        } catch (Exception e) {
            log.error("Error getting system recipients: ", e);
        }
        return groups;
    }

    /**
     * Lấy ngày hiện tại
     */
    private LocalDate getToday() {
        if (timeService != null) {
            return timeService.nowVietnam().toLocalDate();
        }
        return LocalDate.now();
    }

    /**
     * Xóa cache cũ (giữ lại chỉ 7 ngày gần nhất để tránh memory leak)
     */
    @Scheduled(cron = "0 0 0 * * ?", zone = "Asia/Ho_Chi_Minh") // Chạy mỗi ngày lúc 0:00
    public void cleanupOldCache() {
        LocalDate today = getToday();
        LocalDate cutoffDate = today.minusDays(7);
        
        lastSentStatsCache.entrySet().removeIf(entry -> entry.getKey().isBefore(cutoffDate));
        log.info("Cleaned up old cache entries before {}", cutoffDate);
    }

    private static class RecipientGroups {
        private final Set<String> to = new LinkedHashSet<>();
        private final Set<String> cc = new LinkedHashSet<>();
        private final Set<String> bcc = new LinkedHashSet<>();
    }
}

