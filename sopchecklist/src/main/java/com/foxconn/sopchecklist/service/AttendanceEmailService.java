package com.foxconn.sopchecklist.service;

import com.foxconn.sopchecklist.entity.AttendanceReport;
import com.foxconn.sopchecklist.entity.Group;
import com.foxconn.sopchecklist.entity.UserAttendance;
import com.foxconn.sopchecklist.entity.Users;
import com.foxconn.sopchecklist.repository.AttendanceReportRepository;
import com.foxconn.sopchecklist.repository.GroupRepository;
import com.foxconn.sopchecklist.repository.UserAttendanceRepository;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.*;
import java.util.stream.Collectors;

/**
 * Service để tính toán attendance rate và tạo nội dung email
 */
@Service
public class AttendanceEmailService {

    private final AttendanceReportRepository attendanceReportRepository;
    private final UserAttendanceRepository userAttendanceRepository;
    private final GroupRepository groupRepository;

    public AttendanceEmailService(AttendanceReportRepository attendanceReportRepository,
                                  UserAttendanceRepository userAttendanceRepository,
                                  GroupRepository groupRepository) {
        this.attendanceReportRepository = attendanceReportRepository;
        this.userAttendanceRepository = userAttendanceRepository;
        this.groupRepository = groupRepository;
    }

    /**
     * Tính attendance rate tổng thể và theo nhóm cho một ngày
     */
    public AttendanceStats calculateAttendanceStats(LocalDate date) {
        // Lấy tất cả attendance reports cho ngày này
        List<AttendanceReport> reports = attendanceReportRepository.findByAttendanceDate(date);
        
        // Lấy tất cả user đang được theo dõi (active)
        List<UserAttendance> activeUsers = userAttendanceRepository.findByIsActiveTrue();
        Set<Integer> activeUserIds = activeUsers.stream()
            .map(ua -> ua.getUser().getUserID())
            .collect(Collectors.toSet());

        // Tính tổng thể
        int totalEmployees = activeUserIds.size();
        int present = 0;
        int halfDay = 0;
        int absent = 0;
        int leave = 0;

        Map<Integer, AttendanceReport> reportMap = reports.stream()
            .collect(Collectors.toMap(
                r -> r.getUser().getUserID(),
                r -> r,
                (r1, r2) -> r1
            ));

        for (Integer userId : activeUserIds) {
            AttendanceReport report = reportMap.get(userId);
            if (report != null) {
                String status = report.getStatus();
                if (status != null) {
                    if (status.contains("Có mặt") || status.contains("出勤")) {
                        present++;
                    } else if (status.contains("Nửa ngày") || status.contains("半天")) {
                        halfDay++;
                    } else if (status.contains("Vắng") || status.contains("Vắng mặt") || status.contains("缺勤")) {
                        absent++;
                    } else if (status.contains("Nghỉ phép") || status.contains("请假") || 
                               status.contains("Nghỉ CN") || status.contains("周日休")) {
                        leave++;
                    }
                }
            } else {
                // Không có bản ghi = vắng mặt
                absent++;
            }
        }

        // Tính tỉ lệ tổng thể (effective present = present + halfDay * 0.5)
        double effectivePresent = present + halfDay * 0.5;
        int overallRate = totalEmployees > 0 ? (int) Math.round((effectivePresent / totalEmployees) * 100) : 0;

        // Tính theo nhóm - hiển thị TẤT CẢ các nhóm, kể cả nhóm không có nhân viên
        List<GroupStats> groupStatsList = new ArrayList<>();
        List<Group> allGroups = groupRepository.findAll();

        for (Group group : allGroups) {
            // Lấy user IDs trong nhóm này và đang được theo dõi
            Set<Integer> groupUserIds = new java.util.HashSet<>();
            if (group.getUsers() != null && !group.getUsers().isEmpty()) {
                groupUserIds = group.getUsers().stream()
                    .map(Users::getUserID)
                    .filter(activeUserIds::contains)
                    .collect(Collectors.toSet());
            }

            // Hiển thị tất cả nhóm, kể cả nhóm không có nhân viên (sẽ hiển thị 0%)

            int groupPresent = 0;
            int groupHalfDay = 0;
            int groupAbsent = 0;

            for (Integer userId : groupUserIds) {
                AttendanceReport report = reportMap.get(userId);
                if (report != null) {
                    String status = report.getStatus();
                    if (status != null) {
                        if (status.contains("Có mặt") || status.contains("出勤")) {
                            groupPresent++;
                        } else if (status.contains("Nửa ngày") || status.contains("半天")) {
                            groupHalfDay++;
                        } else if (status.contains("Vắng") || status.contains("Vắng mặt") || status.contains("缺勤")) {
                            groupAbsent++;
                        }
                        // Note: Leave status is counted as absent for rate calculation
                    }
                } else {
                    groupAbsent++;
                }
            }

            double groupEffectivePresent = groupPresent + groupHalfDay * 0.5;
            int groupRate = groupUserIds.size() > 0 
                ? (int) Math.round((groupEffectivePresent / groupUserIds.size()) * 100) 
                : 0;

            groupStatsList.add(new GroupStats(
                group.getName(),
                groupUserIds.size(),
                groupPresent,
                groupHalfDay,
                groupAbsent,
                groupRate
            ));
        }

        return new AttendanceStats(
            totalEmployees,
            present,
            halfDay,
            absent,
            leave,
            overallRate,
            groupStatsList
        );
    }

    /**
     * Tạo HTML email với biểu đồ attendance rate
     */
    public String createAttendanceEmailHtml(LocalDate date, AttendanceStats stats) {
        DateTimeFormatter formatter = DateTimeFormatter.ofPattern("dd/MM/yyyy");
        String dateStr = date.format(formatter);

        StringBuilder html = new StringBuilder();
        html.append("<!DOCTYPE html>");
        html.append("<html>");
        html.append("<head>");
        html.append("<meta charset='UTF-8'>");
        html.append("<style>");
        html.append("body { font-family: Arial, sans-serif; margin: 20px; background-color: #f5f5f5; }");
        html.append(".container { max-width: 800px; margin: 0 auto; background-color: white; padding: 20px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }");
        html.append("h2 { color: #1890ff; margin-bottom: 20px; }");
        html.append(".overall-section { margin-bottom: 30px; padding: 20px; background-color: #f9f9f9; border-radius: 8px; }");
        html.append(".overall-title { font-size: 18px; font-weight: bold; margin-bottom: 15px; color: #333; text-align: center; }");
        html.append(".overall-value { font-size: 48px; font-weight: bold; text-align: center; margin: 10px 0 15px; }");
        html.append(".overall-summary { text-align: center; color: #666; font-size: 16px; }");
        html.append(".group-section { margin-top: 30px; }");
        html.append(".group-item { margin-bottom: 20px; padding: 15px; background-color: #fff; border: 1px solid #e8e8e8; border-radius: 6px; }");
        html.append(".group-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px; }");
        html.append(".group-name { font-weight: 500; color: #333; }");
        html.append(".group-rate { font-weight: 500; font-size: 16px; }");
        html.append(".progress-bar-container { width: 100%; height: 20px; background-color: #f0f0f0; border-radius: 10px; overflow: hidden; margin: 10px 0; }");
        html.append(".progress-bar { height: 100%; background-color: #52c41a; transition: width 0.3s; }");
        html.append(".progress-bar.medium { background-color: #ff7a45; }");
        html.append(".progress-bar.low { background-color: #ff4d4f; }");
        html.append(".group-details { color: #666; font-size: 14px; }");
        html.append("</style>");
        html.append("</head>");
        html.append("<body>");
        html.append("<div class='container'>");
        html.append("<h2>Thông báo nhân viên IT đi làm ngày ").append(dateStr).append("</h2>");
        
        // Tỉ lệ tổng thể - dùng table-based layout với inline styles để tương thích với email client
        String overallColor = stats.overallRate >= 80 ? "#52c41a" : stats.overallRate >= 50 ? "#ff7a45" : "#ff4d4f";
        html.append("<div class='overall-section'>");
        html.append("<div class='overall-title'>Tỉ lệ đi làm tổng thể</div>");
        html.append("<div class='overall-value' style='color: ").append(overallColor).append(";'>")
            .append(stats.overallRate).append("%</div>");
        html.append("<div class='overall-summary'>");
        html.append(stats.present).append(" có mặt, ")
             .append(stats.halfDay).append(" nửa ngày, ")
             .append(stats.absent).append(" vắng");
        html.append("</div>");
        html.append("</div>");

        // Tỉ lệ theo nhóm
        html.append("<div class='group-section'>");
        for (GroupStats group : stats.groupStats) {
            String barClass = group.rate >= 80 ? "" : group.rate >= 50 ? "medium" : "low";
            String rateColor = group.rate >= 80 ? "#52c41a" : group.rate >= 50 ? "#ff7a45" : "#ff4d4f";
            
            html.append("<div class='group-item'>");
            html.append("<div class='group-header'>");
            html.append("<div class='group-name'>Nhóm ").append(group.name).append(" (").append(group.totalEmployees).append(" người)</div>");
            html.append("<div class='group-rate' style='color: ").append(rateColor).append(";'>").append(group.rate).append("%</div>");
            html.append("</div>");
            html.append("<div class='progress-bar-container'>");
            html.append("<div class='progress-bar ").append(barClass).append("' style='width: ").append(group.rate).append("%;'></div>");
            html.append("</div>");
            html.append("<div class='group-details'>");
            html.append(group.present).append(" có mặt, ")
                 .append(group.halfDay).append(" nửa ngày, ")
                 .append(group.absent).append(" vắng");
            html.append("</div>");
            html.append("</div>");
        }
        html.append("</div>");

        html.append("</div>");
        html.append("</body>");
        html.append("</html>");

        return html.toString();
    }

    /**
     * Lấy danh sách email của tất cả employees trong tracking list
     */
    public List<String> getTrackingListEmails() {
        List<UserAttendance> activeUsers = userAttendanceRepository.findByIsActiveTrue();
        return activeUsers.stream()
            .map(ua -> ua.getUser())
            .filter(user -> user.getEmail() != null && !user.getEmail().trim().isEmpty())
            .map(Users::getEmail)
            .distinct()
            .collect(Collectors.toList());
    }

    // Inner classes for data structure
    public static class AttendanceStats {
        public final int totalEmployees;
        public final int present;
        public final int halfDay;
        public final int absent;
        public final int leave;
        public final int overallRate;
        public final List<GroupStats> groupStats;

        public AttendanceStats(int totalEmployees, int present, int halfDay, int absent, int leave,
                              int overallRate, List<GroupStats> groupStats) {
            this.totalEmployees = totalEmployees;
            this.present = present;
            this.halfDay = halfDay;
            this.absent = absent;
            this.leave = leave;
            this.overallRate = overallRate;
            this.groupStats = groupStats;
        }
    }

    public static class GroupStats {
        public final String name;
        public final int totalEmployees;
        public final int present;
        public final int halfDay;
        public final int absent;
        public final int rate;

        public GroupStats(String name, int totalEmployees, int present, int halfDay, int absent, int rate) {
            this.name = name;
            this.totalEmployees = totalEmployees;
            this.present = present;
            this.halfDay = halfDay;
            this.absent = absent;
            this.rate = rate;
        }
    }
}

