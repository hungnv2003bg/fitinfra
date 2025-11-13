package com.foxconn.sopchecklist.repository;

import com.foxconn.sopchecklist.entity.AttendanceReport;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

public interface AttendanceReportRepository extends JpaRepository<AttendanceReport, Long> {
    
    // Tìm bản ghi điểm danh theo user và ngày
    Optional<AttendanceReport> findByUser_UserIDAndAttendanceDate(Integer userId, LocalDate date);
    
    // Tìm tất cả bản ghi điểm danh của một user
    List<AttendanceReport> findByUser_UserIDOrderByAttendanceDateDesc(Integer userId);
    
    // Tìm tất cả bản ghi điểm danh trong một khoảng thời gian
    List<AttendanceReport> findByAttendanceDateBetween(LocalDate startDate, LocalDate endDate);
    
    // Tìm tất cả bản ghi điểm danh của một user trong khoảng thời gian
    List<AttendanceReport> findByUser_UserIDAndAttendanceDateBetween(
            Integer userId, LocalDate startDate, LocalDate endDate);
    
    // Tìm tất cả bản ghi điểm danh theo ngày
    List<AttendanceReport> findByAttendanceDate(LocalDate date);
    
    // Tìm tất cả bản ghi điểm danh theo trạng thái và ngày
    List<AttendanceReport> findByStatusAndAttendanceDate(String status, LocalDate date);
}

