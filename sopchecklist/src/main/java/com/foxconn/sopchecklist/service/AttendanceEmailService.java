package com.foxconn.sopchecklist.service;

import com.foxconn.sopchecklist.entity.AttendanceReport;
import com.foxconn.sopchecklist.entity.Group;
import com.foxconn.sopchecklist.entity.UserAttendance;
import com.foxconn.sopchecklist.entity.Users;
import com.foxconn.sopchecklist.repository.AttendanceReportRepository;
import com.foxconn.sopchecklist.repository.GroupRepository;
import com.foxconn.sopchecklist.repository.UserAttendanceRepository;
import org.springframework.beans.factory.annotation.Value;
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

    @Value("${app.public.url:http://10.228.64.77:3000}")
    private String appPublicUrl;

    public AttendanceEmailService(AttendanceReportRepository attendanceReportRepository,
                                  UserAttendanceRepository userAttendanceRepository,
                                  GroupRepository groupRepository) {
        this.attendanceReportRepository = attendanceReportRepository;
        this.userAttendanceRepository = userAttendanceRepository;
        this.groupRepository = groupRepository;
    }

    
    public AttendanceStats calculateAttendanceStats(LocalDate date) {
        List<AttendanceReport> reports = attendanceReportRepository.findByAttendanceDate(date);
        
        List<UserAttendance> activeUsers = userAttendanceRepository.findByIsActiveTrue();
        Set<Integer> activeUserIds = activeUsers.stream()
            .map(ua -> ua.getUser().getUserID())
            .collect(Collectors.toSet());

        int totalEmployees = activeUserIds.size();
        int present = 0;
        int halfDay = 0;
        int absent = 0;
        int leave = 0;
        int weekendLeave = 0;

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
                    } else if (status.contains("Nghỉ CN") || status.contains("周日休")) {
                        weekendLeave++;
                    } else if (status.contains("Nghỉ phép") || status.contains("请假")) {
                        leave++;
                    }
                }
            } else {
                absent++;
            }
        }

        double effectivePresent = present + halfDay * 0.5;
        int overallRate = totalEmployees > 0 ? (int) Math.round((effectivePresent / totalEmployees) * 100) : 0;

        List<GroupStats> groupStatsList = new ArrayList<>();
        List<Group> allGroups = groupRepository.findAll();

        for (Group group : allGroups) {
            Set<Integer> groupUserIds = new java.util.HashSet<>();
            if (group.getUsers() != null && !group.getUsers().isEmpty()) {
                groupUserIds = group.getUsers().stream()
                    .map(Users::getUserID)
                    .filter(activeUserIds::contains)
                    .collect(Collectors.toSet());
            }


            int groupPresent = 0;
            int groupHalfDay = 0;
            int groupAbsent = 0;
            int groupLeave = 0;
            int groupWeekendLeave = 0;

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
                        } else if (status.contains("Nghỉ CN") || status.contains("周日休")) {
                            groupWeekendLeave++;
                        } else if (status.contains("Nghỉ phép") || status.contains("请假")) {
                            groupLeave++;
                        }
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
                groupLeave,
                groupWeekendLeave,
                groupRate
            ));
        }

        return new AttendanceStats(
            totalEmployees,
            present,
            halfDay,
            absent,
            leave,
            weekendLeave,
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
        html.append("<!DOCTYPE html><html><head><meta charset=\"UTF-8\"><style>");
        html.append("body{font-family:Arial;margin:20px;background:#f5f5f5}");
        html.append(".c{max-width:800px;margin:auto;background:#fff;padding:20px;border-radius:8px;box-shadow:0 2px 4px #0001}");
        html.append("h2{color:#1890ff;margin-bottom:15px}");
        html.append(".o{margin-bottom:20px;padding:15px;background:#f9f9f9;border-radius:8px;text-align:center}");
        html.append(".ov{font-size:40px;font-weight:700;color:#52c41a;margin:10px 0}");
        html.append(".g{margin-bottom:15px;padding:12px;border:1px solid #e8e8e8;border-radius:6px;font-size:14px}");
        html.append(".h{display:flex;justify-content:space-between;margin-bottom:6px;font-weight:500}");
        html.append(".b{height:16px;background:#f0f0f0;border-radius:8px;overflow:hidden;margin:6px 0}");
        html.append(".bar{height:100%;background:#52c41a}");
        html.append(".m{background:#ff7a45!important}");
        html.append(".l{background:#ff4d4f!important}");
        html.append(".present{color:#52c41a!important}"); 
        html.append(".leave{color:#ff7a45!important}"); 
        html.append(".weekend{color:#3b82f6!important}");
        html.append(".absent{color:#ff4d4f!important}");
        html.append("</style></head><body><div class=\"c\">");
        html.append("<h2>Thông báo nhân viên IT đi làm / IT员工出勤通知: ").append(dateStr).append("</h2>");
        
        // Tỉ lệ tổng thể
        String overallColor = stats.overallRate >= 80 ? "#52c41a" : stats.overallRate >= 50 ? "#ff7a45" : "#ff4d4f";
        html.append("<div class=\"o\"><div>Tỉ lệ đi làm tổng thể / 总体出勤率</div>");
        html.append("<div class=\"ov\" style=\"color:").append(overallColor).append("\">").append(stats.overallRate).append("%</div>");
        html.append("<div><span class=\"present\">").append(stats.present).append(" có mặt / 出勤</span>, ")
             .append(stats.halfDay).append(" nửa ngày / 半天, ")
             .append("<span class=\"leave\">").append(stats.leave).append(" nghỉ phép / 请假</span>, ")
             .append("<span class=\"weekend\">").append(stats.weekendLeave).append(" nghỉ CN / 周日休</span>, ")
             .append("<span class=\"absent\">").append(stats.absent).append(" vắng / 缺勤</span></div></div>");

        // Tỉ lệ theo nhóm
        for (GroupStats group : stats.groupStats) {
            String barClass = group.rate >= 80 ? "" : group.rate >= 50 ? " m" : " l";
            String rateColor = group.rate >= 80 ? "#52c41a" : group.rate >= 50 ? "#ff7a45" : "#ff4d4f";
            
            html.append("<div class=\"g\">");
            html.append("<div class=\"h\"><span>Nhóm / 组: ").append(group.name).append(" (").append(group.totalEmployees).append(" người / 人)</span>");
            html.append("<span style=\"color:").append(rateColor).append("\">").append(group.rate).append("%</span></div>");
            html.append("<div class=\"b\"><div class=\"bar").append(barClass).append("\" style=\"width:").append(group.rate).append("%\"></div></div>");
            html.append("<span class=\"present\">").append(group.present).append(" có mặt / 出勤</span>, ")
                 .append(group.halfDay).append(" nửa ngày / 半天, ")
                 .append("<span class=\"leave\">").append(group.leave).append(" nghỉ phép / 请假</span>, ")
                 .append("<span class=\"weekend\">").append(group.weekendLeave).append(" nghỉ CN / 周日休</span>, ")
                 .append("<span class=\"absent\">").append(group.absent).append(" vắng / 缺勤</span>");
            html.append("</div>");
        }

        
        try {
        
            DateTimeFormatter urlFormatter = DateTimeFormatter.ofPattern("yyyy-MM-dd");
            String dateUrl = date.format(urlFormatter);
            String link = appPublicUrl + "/attendance?date=" + dateUrl;
            html.append("<p style=\"margin-top:20px;text-align:center;\"><a href=\"")
                .append(link)
                .append("\" style=\"display:inline-block;background:#1890ff;color:#fff;padding:8px 12px;border-radius:4px;text-decoration:none;\">Xem chi tiết / 查看详情</a></p>");
        } catch (Exception ignore) {}

        // Chữ ký
        html.append("<p style=\"margin-top:20px;\"><strong>Trân trọng / 此致,</strong></p>");
        html.append("<p><em>Hệ thống IT Management / IT管理系统</em></p>");

        html.append("</div></body></html>");

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
        public final int weekendLeave;
        public final int overallRate;
        public final List<GroupStats> groupStats;

        public AttendanceStats(int totalEmployees, int present, int halfDay, int absent, int leave, int weekendLeave,
                              int overallRate, List<GroupStats> groupStats) {
            this.totalEmployees = totalEmployees;
            this.present = present;
            this.halfDay = halfDay;
            this.absent = absent;
            this.leave = leave;
            this.weekendLeave = weekendLeave;
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
        public final int leave;
        public final int weekendLeave;
        public final int rate;

        public GroupStats(String name, int totalEmployees, int present, int halfDay, int absent, int leave, int weekendLeave, int rate) {
            this.name = name;
            this.totalEmployees = totalEmployees;
            this.present = present;
            this.halfDay = halfDay;
            this.absent = absent;
            this.leave = leave;
            this.weekendLeave = weekendLeave;
            this.rate = rate;
        }
    }
}

