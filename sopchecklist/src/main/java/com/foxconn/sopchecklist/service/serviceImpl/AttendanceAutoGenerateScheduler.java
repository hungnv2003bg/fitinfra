package com.foxconn.sopchecklist.service.serviceImpl;

import com.foxconn.sopchecklist.entity.AttendanceReport;
import com.foxconn.sopchecklist.entity.UserAttendance;
import com.foxconn.sopchecklist.repository.UserAttendanceRepository;
import com.foxconn.sopchecklist.service.AttendanceReportService;
import com.foxconn.sopchecklist.service.TimeService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.List;

/**
 * Scheduler để tự động tạo bản ghi điểm danh hàng ngày cho các user trong danh sách UserAttendance
 * Chạy mỗi ngày lúc 00:05 (sau nửa đêm) để đảm bảo luôn có dữ liệu cho 7 ngày gần nhất
 * (từ hôm nay đến 6 ngày sau) cho tất cả user có trạng thái 'Hoạt động' bật
 */
@Component
public class AttendanceAutoGenerateScheduler {

    private static final Logger log = LoggerFactory.getLogger(AttendanceAutoGenerateScheduler.class);

    @Autowired
    private UserAttendanceRepository userAttendanceRepository;

    @Autowired
    private AttendanceReportService attendanceReportService;

    @Autowired(required = false)
    private TimeService timeService;

    // Chạy mỗi ngày lúc 00:05 theo giờ Việt Nam
    @Scheduled(cron = "0 5 0 * * ?", zone = "Asia/Ho_Chi_Minh")
    @Transactional
    public void generateDailyAttendance() {
        LocalDate today = getToday();
        log.info("=== AttendanceAutoGenerateScheduler: Starting daily attendance generation for date: {} ===", today);

        try {
            // Lấy danh sách tất cả user đang được theo dõi (isActive = true)
            List<UserAttendance> activeUsers = userAttendanceRepository.findByIsActiveTrue();
            log.info("Found {} active users to generate attendance", activeUsers.size());

            int totalCreated = 0;
            int totalSkipped = 0;

            for (UserAttendance userAttendance : activeUsers) {
                Integer userId = userAttendance.getUser().getUserID();
                String shift = userAttendance.getShift() != null ? userAttendance.getShift() : "Ngày";

                try {
                    // Đảm bảo luôn có dữ liệu cho 7 ngày gần nhất (từ hôm nay đến 6 ngày sau)
                    // Method này sẽ tự động kiểm tra và bỏ qua nếu đã tồn tại
                    List<AttendanceReport> createdReports = attendanceReportService.createAttendanceForNext7Days(userId, shift);
                    totalCreated += createdReports.size();
                    log.debug("Created {} attendance records for user {} (shift: {}) for next 7 days", 
                        createdReports.size(), userId, shift);
                } catch (Exception e) {
                    // Nếu có lỗi, log và tiếp tục với user khác
                    log.warn("Error generating attendance for user {}: {}", userId, e.getMessage());
                    totalSkipped++;
                }
            }

            log.info("=== AttendanceAutoGenerateScheduler: Completed. Total Created: {}, Users Skipped: {} ===", 
                totalCreated, totalSkipped);
        } catch (Exception e) {
            log.error("Error in AttendanceAutoGenerateScheduler: ", e);
        }
    }

    private LocalDate getToday() {
        if (timeService != null) {
            return timeService.nowVietnam().toLocalDate();
        }
        return LocalDate.now();
    }
}

