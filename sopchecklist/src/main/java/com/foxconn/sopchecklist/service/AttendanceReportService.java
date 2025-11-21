package com.foxconn.sopchecklist.service;

import com.foxconn.sopchecklist.entity.AttendanceReport;
import com.foxconn.sopchecklist.entity.Users;
import com.foxconn.sopchecklist.repository.AttendanceReportRepository;
import com.foxconn.sopchecklist.repository.UsersRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

@Service
public class AttendanceReportService {

    private final AttendanceReportRepository repository;
    private final UsersRepository usersRepository;
    
    @Autowired(required = false)
    private TimeService timeService;

    public AttendanceReportService(AttendanceReportRepository repository, UsersRepository usersRepository) {
        this.repository = repository;
        this.usersRepository = usersRepository;
    }

    public List<AttendanceReport> findAll() {
        return repository.findAll();
    }

    public AttendanceReport findById(Long id) {
        return repository.findById(id).orElse(null);
    }

    public List<AttendanceReport> findByDate(LocalDate date) {
        return repository.findByAttendanceDate(date);
    }

    public List<AttendanceReport> findByUserId(Integer userId) {
        return repository.findByUser_UserIDOrderByAttendanceDateDesc(userId);
    }

    public Optional<AttendanceReport> findByUserIdAndDate(Integer userId, LocalDate date) {
        return repository.findByUser_UserIDAndAttendanceDate(userId, date);
    }

    public List<AttendanceReport> findByDateRange(LocalDate startDate, LocalDate endDate) {
        return repository.findByAttendanceDateBetween(startDate, endDate);
    }

    public List<AttendanceReport> findByUserIdAndDateRange(Integer userId, LocalDate startDate, LocalDate endDate) {
        return repository.findByUser_UserIDAndAttendanceDateBetween(userId, startDate, endDate);
    }

    public List<AttendanceReport> findByStatusAndDate(String status, LocalDate date) {
        return repository.findByStatusAndAttendanceDate(status, date);
    }

    @Transactional
    public AttendanceReport create(AttendanceReport attendanceReport) {
        validate(attendanceReport);
        
        // Kiểm tra xem đã có bản ghi cho user và ngày này chưa
        Optional<AttendanceReport> existing = repository.findByUser_UserIDAndAttendanceDate(
            attendanceReport.getUser().getUserID(), 
            attendanceReport.getAttendanceDate()
        );
        
        if (existing.isPresent()) {
            throw new IllegalArgumentException("Đã tồn tại bản ghi điểm danh cho nhân viên này trong ngày này");
        }

        attendanceReport.setId(null);
        attendanceReport.setCreatedAt(LocalDateTime.now());
        return repository.save(attendanceReport);
    }

    @Transactional
    public AttendanceReport createOrUpdate(Integer userId, LocalDate attendanceDate, String status, 
                                          LocalTime clockInTime, LocalTime clockOutTime, String note, String shift) {
        Users user = usersRepository.findById(userId)
            .orElseThrow(() -> new IllegalArgumentException("Không tìm thấy user với ID: " + userId));

        Optional<AttendanceReport> existing = repository.findByUser_UserIDAndAttendanceDate(userId, attendanceDate);
        
        // Nếu status là Vắng mặt, Nghỉ phép, hoặc Nghỉ CN thì tự động xóa giờ vào/ra
        boolean shouldClearTime = status != null && (
            status.contains("Vắng") || status.contains("Vắng mặt") || status.contains("缺勤") ||
            status.contains("Nghỉ phép") || status.contains("请假") ||
            status.contains("Nghỉ CN") || status.contains("周日休")
        );
        
        // Nếu status là Có mặt, Đi muộn, hoặc Nửa ngày và chưa có giờ vào/ra thì tự động set
        boolean shouldSetDefaultTime = !shouldClearTime && status != null && (
            status.contains("Có mặt") || status.contains("出勤") ||
            status.contains("Đi muộn") || status.contains("迟到") ||
            status.contains("Nửa ngày") || status.contains("半天")
        ) && (clockInTime == null || clockOutTime == null);
        
        LocalTime finalClockInTime;
        LocalTime finalClockOutTime;
        
        if (shouldClearTime) {
            finalClockInTime = null;
            finalClockOutTime = null;
        } else if (shouldSetDefaultTime) {
            // Xác định giờ vào/ra dựa trên ca
            boolean isNightShift = "Đêm".equals(shift);
            finalClockInTime = clockInTime != null ? clockInTime : (isNightShift ? LocalTime.of(20, 0) : LocalTime.of(8, 0));
            finalClockOutTime = clockOutTime != null ? clockOutTime : (isNightShift ? LocalTime.of(5, 0) : LocalTime.of(17, 0));
        } else {
            finalClockInTime = clockInTime;
            finalClockOutTime = clockOutTime;
        }
        
        AttendanceReport attendanceReport;
        if (existing.isPresent()) {
            attendanceReport = existing.get();
            attendanceReport.setStatus(status);
            attendanceReport.setClockInTime(finalClockInTime);
            attendanceReport.setClockOutTime(finalClockOutTime);
            attendanceReport.setNote(note);
            if (shift != null && !shift.trim().isEmpty()) {
                attendanceReport.setShift(shift);
            }
            attendanceReport.setUpdatedAt(LocalDateTime.now());
        } else {
            attendanceReport = new AttendanceReport();
            attendanceReport.setUser(user);
            attendanceReport.setAttendanceDate(attendanceDate);
            attendanceReport.setStatus(status);
            attendanceReport.setClockInTime(finalClockInTime);
            attendanceReport.setClockOutTime(finalClockOutTime);
            attendanceReport.setNote(note);
            attendanceReport.setShift(shift != null && !shift.trim().isEmpty() ? shift : "Ngày");
            attendanceReport.setCreatedAt(LocalDateTime.now());
        }

        return repository.save(attendanceReport);
    }

    @Transactional
    public AttendanceReport update(Long id, AttendanceReport attendanceReport) {
        validate(attendanceReport);
        
        AttendanceReport existing = repository.findById(id)
            .orElseThrow(() -> new IllegalArgumentException("Không tìm thấy bản ghi điểm danh với ID: " + id));

        // Kiểm tra nếu thay đổi user hoặc date, phải đảm bảo không trùng
        if (!existing.getUser().getUserID().equals(attendanceReport.getUser().getUserID()) ||
            !existing.getAttendanceDate().equals(attendanceReport.getAttendanceDate())) {
            Optional<AttendanceReport> duplicate = repository.findByUser_UserIDAndAttendanceDate(
                attendanceReport.getUser().getUserID(),
                attendanceReport.getAttendanceDate()
            );
            if (duplicate.isPresent() && !duplicate.get().getId().equals(id)) {
                throw new IllegalArgumentException("Đã tồn tại bản ghi điểm danh cho nhân viên này trong ngày này");
            }
        }

        existing.setUser(attendanceReport.getUser());
        existing.setAttendanceDate(attendanceReport.getAttendanceDate());
        existing.setStatus(attendanceReport.getStatus());
        
        // Nếu status là Vắng mặt, Nghỉ phép, hoặc Nghỉ CN thì tự động xóa giờ vào/ra
        String status = attendanceReport.getStatus();
        boolean shouldClearTime = status != null && (
            status.contains("Vắng") || status.contains("Vắng mặt") || status.contains("缺勤") ||
            status.contains("Nghỉ phép") || status.contains("请假") ||
            status.contains("Nghỉ CN") || status.contains("周日休")
        );
        
        // Nếu status là Có mặt, Đi muộn, hoặc Nửa ngày và chưa có giờ vào/ra thì tự động set
        boolean shouldSetDefaultTime = !shouldClearTime && status != null && (
            status.contains("Có mặt") || status.contains("出勤") ||
            status.contains("Đi muộn") || status.contains("迟到") ||
            status.contains("Nửa ngày") || status.contains("半天")
        ) && (attendanceReport.getClockInTime() == null || attendanceReport.getClockOutTime() == null);
        
        LocalTime finalClockInTime;
        LocalTime finalClockOutTime;
        
        if (shouldClearTime) {
            finalClockInTime = null;
            finalClockOutTime = null;
        } else if (shouldSetDefaultTime) {
            // Xác định giờ vào/ra dựa trên ca
            String shift = attendanceReport.getShift() != null && !attendanceReport.getShift().trim().isEmpty() 
                ? attendanceReport.getShift() 
                : existing.getShift();
            boolean isNightShift = "Đêm".equals(shift);
            finalClockInTime = attendanceReport.getClockInTime() != null 
                ? attendanceReport.getClockInTime() 
                : (isNightShift ? LocalTime.of(20, 0) : LocalTime.of(8, 0));
            finalClockOutTime = attendanceReport.getClockOutTime() != null 
                ? attendanceReport.getClockOutTime() 
                : (isNightShift ? LocalTime.of(5, 0) : LocalTime.of(17, 0));
        } else {
            finalClockInTime = attendanceReport.getClockInTime();
            finalClockOutTime = attendanceReport.getClockOutTime();
        }
        
        existing.setClockInTime(finalClockInTime);
        existing.setClockOutTime(finalClockOutTime);
        existing.setNote(attendanceReport.getNote());
        if (attendanceReport.getShift() != null && !attendanceReport.getShift().trim().isEmpty()) {
            existing.setShift(attendanceReport.getShift());
        }
        existing.setUpdatedAt(LocalDateTime.now());

        return repository.save(existing);
    }

    @Transactional
    public void delete(Long id) {
        if (!repository.existsById(id)) {
            throw new IllegalArgumentException("Không tìm thấy bản ghi điểm danh với ID: " + id);
        }
        repository.deleteById(id);
    }

    @Transactional
    public void deleteByUserIdAndDateRange(Integer userId, LocalDate startDate, LocalDate endDate) {
        List<AttendanceReport> reports = repository.findByUser_UserIDAndAttendanceDateBetween(userId, startDate, endDate);
        repository.deleteAll(reports);
    }

    @Transactional
    public List<AttendanceReport> createAttendanceForNext7Days(Integer userId, String shift) {
        Users user = usersRepository.findById(userId)
            .orElseThrow(() -> new IllegalArgumentException("Không tìm thấy user với ID: " + userId));

        // Lấy ngày hiện tại theo timezone Việt Nam
        LocalDate today;
        if (timeService != null) {
            today = timeService.nowVietnam().toLocalDate();
        } else {
            today = LocalDate.now();
        }

        // Xác định giờ vào/ra dựa trên ca
        boolean isNightShift = "Đêm".equals(shift);
        LocalTime clockInTime = isNightShift ? LocalTime.of(20, 0) : LocalTime.of(8, 0);
        LocalTime clockOutTime = isNightShift ? LocalTime.of(5, 0) : LocalTime.of(17, 0);

        List<AttendanceReport> createdReports = new ArrayList<>();
        // Tạo 7 ngày từ hôm nay đến 6 ngày sau
        for (int i = 0; i < 7; i++) {
            LocalDate attendanceDate = today.plusDays(i);
            boolean isSunday = attendanceDate.getDayOfWeek() == DayOfWeek.SUNDAY;
            
            // Kiểm tra xem đã có bản ghi chưa
            Optional<AttendanceReport> existing = repository.findByUser_UserIDAndAttendanceDate(userId, attendanceDate);
            
            if (existing.isPresent()) {
                // Nếu đã tồn tại, bỏ qua
                continue;
            }

            AttendanceReport attendanceReport = new AttendanceReport();
            attendanceReport.setUser(user);
            attendanceReport.setAttendanceDate(attendanceDate);
            attendanceReport.setStatus(isSunday ? "Nghỉ CN" : "Có mặt");
            attendanceReport.setClockInTime(isSunday ? null : clockInTime);
            attendanceReport.setClockOutTime(isSunday ? null : clockOutTime);
            attendanceReport.setNote(null);
            attendanceReport.setShift(shift != null && !shift.trim().isEmpty() ? shift : "Ngày");
            attendanceReport.setCreatedAt(LocalDateTime.now());

            createdReports.add(repository.save(attendanceReport));
        }

        return createdReports;
    }

    /**
     * Tạo điểm danh cho ngày hôm nay cho một user
     * Được sử dụng bởi scheduler hoặc manual trigger
     */
    @Transactional
    public AttendanceReport createTodayAttendance(Integer userId, String defaultStatus, String shift) {
        Users user = usersRepository.findById(userId)
            .orElseThrow(() -> new IllegalArgumentException("Không tìm thấy user với ID: " + userId));

        LocalDate today;
        if (timeService != null) {
            today = timeService.nowVietnam().toLocalDate();
        } else {
            today = LocalDate.now();
        }

        // Kiểm tra xem đã có bản ghi chưa
        Optional<AttendanceReport> existing = repository.findByUser_UserIDAndAttendanceDate(userId, today);
        if (existing.isPresent()) {
            return existing.get(); // Trả về bản ghi đã tồn tại
        }

        // Xác định giờ vào/ra dựa trên ca
        boolean isNightShift = "Đêm".equals(shift);
        LocalTime clockInTime = isNightShift ? LocalTime.of(20, 0) : LocalTime.of(8, 0);
        LocalTime clockOutTime = isNightShift ? LocalTime.of(5, 0) : LocalTime.of(17, 0);

        boolean isSunday = today.getDayOfWeek() == DayOfWeek.SUNDAY;
        AttendanceReport attendanceReport = new AttendanceReport();
        attendanceReport.setUser(user);
        attendanceReport.setAttendanceDate(today);
        String resolvedStatus = isSunday ? "Nghỉ CN" : (defaultStatus != null ? defaultStatus : "Có mặt");
        attendanceReport.setStatus(resolvedStatus);
        attendanceReport.setClockInTime(isSunday ? null : clockInTime);
        attendanceReport.setClockOutTime(isSunday ? null : clockOutTime);
        attendanceReport.setNote(null);
        attendanceReport.setShift(shift != null && !shift.trim().isEmpty() ? shift : "Ngày");
        attendanceReport.setCreatedAt(LocalDateTime.now());

        return repository.save(attendanceReport);
    }

    private void validate(AttendanceReport attendanceReport) {
        if (attendanceReport == null) {
            throw new IllegalArgumentException("AttendanceReport không được null");
        }
        if (attendanceReport.getUser() == null) {
            throw new IllegalArgumentException("User không được null");
        }
        if (attendanceReport.getAttendanceDate() == null) {
            throw new IllegalArgumentException("Ngày điểm danh không được null");
        }
        if (attendanceReport.getStatus() == null || attendanceReport.getStatus().trim().isEmpty()) {
            throw new IllegalArgumentException("Trạng thái không được null hoặc rỗng");
        }
    }
}

