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
import java.util.ArrayList;
import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;

/**
 * Scheduler để gửi email báo cáo điểm danh hàng ngày lúc 6:10 AM
 * Gửi tới:
 * 1. Người thông báo nhận mail từ system settings (ATTENDANCE type)
 * 2. Tất cả nhân viên trong danh sách theo dõi
 */
@Component
public class AttendanceEmailScheduler {

    private static final Logger log = LoggerFactory.getLogger(AttendanceEmailScheduler.class);

    @Autowired
    private AttendanceEmailService attendanceEmailService;

    @Autowired
    private CronMailAllSendService cronMailAllSendService;

    @Autowired
    private MailRecipientAllService mailRecipientAllService;

    @Autowired(required = false)
    private TimeService timeService;

    /**
     * Chạy mỗi ngày lúc 8:00 AM theo giờ Việt Nam
     * Cron expression: "0 0 8 * * ?" = giây phút giờ ngày tháng thứ
     */
    @Scheduled(cron = "0 0 9 * * ?", zone = "Asia/Ho_Chi_Minh")
    @Transactional
    public void sendDailyAttendanceEmail() {
        LocalDate today = getToday();
        log.info("=== AttendanceEmailScheduler: Starting daily attendance email for date: {} ===", today);

        try {
            // Tính attendance stats cho ngày hiện tại
            AttendanceEmailService.AttendanceStats stats = attendanceEmailService.calculateAttendanceStats(today);
            log.info("Calculated attendance stats: Overall rate: {}%, Total employees: {}", 
                stats.overallRate, stats.totalEmployees);

            // Tạo HTML email
            String emailHtml = attendanceEmailService.createAttendanceEmailHtml(today, stats);

            // Tạo subject
            DateTimeFormatter formatter = DateTimeFormatter.ofPattern("dd/MM/yyyy");
            String subject = "Thông báo nhân viên IT đi làm ngày " + today.format(formatter);

            // Lấy email recipients từ system settings (ATTENDANCE type)
            List<String> systemRecipients = getSystemRecipients();
            log.info("Found {} system recipients", systemRecipients.size());

            // Lấy email của tất cả employees trong tracking list
            List<String> trackingListEmails = attendanceEmailService.getTrackingListEmails();
            log.info("Found {} employees in tracking list", trackingListEmails.size());

            // Kết hợp tất cả email (loại bỏ trùng lặp)
            Set<String> allRecipients = new java.util.HashSet<>();
            allRecipients.addAll(systemRecipients);
            allRecipients.addAll(trackingListEmails);

            if (allRecipients.isEmpty()) {
                log.warn("No recipients found, skipping email send");
                return;
            }

            String toCsv = String.join(",", allRecipients);
            log.info("Sending email to {} recipients", allRecipients.size());

            // Gửi email
            CronMailAll mail = cronMailAllSendService.sendMailCustom(
                "ATTENDANCE",
                toCsv,
                null, // CC
                null, // BCC
                subject,
                emailHtml,
                null // referenceId
            );

            if (mail != null) {
                log.info("=== AttendanceEmailScheduler: Email sent successfully. Mail ID: {} ===", mail.getId());
            } else {
                log.error("=== AttendanceEmailScheduler: Failed to send email ===");
            }

        } catch (Exception e) {
            log.error("Error in AttendanceEmailScheduler: ", e);
        }
    }

    /**
     * Lấy danh sách email recipients từ system settings (ATTENDANCE type)
     */
    private List<String> getSystemRecipients() {
        try {
            List<MailRecipientAll> recipients = mailRecipientAllService
                .findByTypeMailRecipientTypeNameAndEnabledTrue("ATTENDANCE");
            
            return recipients.stream()
                .map(MailRecipientAll::getEmail)
                .filter(email -> email != null && !email.trim().isEmpty())
                .distinct()
                .collect(Collectors.toList());
        } catch (Exception e) {
            log.error("Error getting system recipients: ", e);
            return new ArrayList<>();
        }
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
}

