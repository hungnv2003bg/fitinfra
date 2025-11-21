package com.foxconn.sopchecklist.service;

import com.foxconn.sopchecklist.entity.UserAttendance;
import com.foxconn.sopchecklist.entity.Users;
import com.foxconn.sopchecklist.repository.UserAttendanceRepository;
import com.foxconn.sopchecklist.repository.UsersRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Service
public class UserAttendanceService {

    private final UserAttendanceRepository repository;
    private final UsersRepository usersRepository;
    
    @Autowired(required = false)
    private AttendanceReportService attendanceReportService;
    
    @Autowired(required = false)
    private TimeService timeService;

    public UserAttendanceService(UserAttendanceRepository repository, UsersRepository usersRepository) {
        this.repository = repository;
        this.usersRepository = usersRepository;
    }

    public List<UserAttendance> findAll() {
        return repository.findAllOrderedByIsActiveAndCreatedAt();
    }

    public List<UserAttendance> findActiveUsers() {
        return repository.findByIsActiveTrue();
    }

    public UserAttendance findById(Long id) {
        return repository.findById(id).orElse(null);
    }

    public Optional<UserAttendance> findByUserId(Integer userId) {
        return repository.findByUser_UserID(userId);
    }

    /**
     * Normalize shift value to ensure it's always "Ngày" or "Đêm" with proper Vietnamese characters
     */
    private String normalizeShift(String shift) {
        if (shift == null || shift.trim().isEmpty()) {
            return "Ngày";
        }
        String normalized = shift.trim();
        // Handle various possible inputs for night shift
        String lowerNormalized = normalized.toLowerCase();
        if (lowerNormalized.equals("đêm") || lowerNormalized.equals("dem") || 
            lowerNormalized.contains("đêm") || lowerNormalized.equals("night")) {
            return "Đêm";
        }
        // Default to "Ngày" for any other value (including "Ngày", "Ngay", "day", etc.)
        return "Ngày";
    }

    @Transactional
    public UserAttendance create(Integer userId, String shift) {
        Users user = usersRepository.findById(userId)
            .orElseThrow(() -> new IllegalArgumentException("Không tìm thấy user với ID: " + userId));

        // Kiểm tra xem đã tồn tại chưa
        Optional<UserAttendance> existing = repository.findByUser_UserID(userId);
        if (existing.isPresent()) {
            throw new IllegalArgumentException("User này đã được thêm vào danh sách theo dõi điểm danh");
        }

        UserAttendance userAttendance = new UserAttendance();
        userAttendance.setUser(user);
        userAttendance.setIsActive(true);
        String finalShift = normalizeShift(shift);
        userAttendance.setShift(finalShift);
        userAttendance.setCreatedAt(LocalDateTime.now());

        UserAttendance saved = repository.save(userAttendance);

        // Tự động tạo điểm danh cho 7 ngày gần nhất khi thêm user mới vào tracking list
        if (attendanceReportService != null) {
            try {
                attendanceReportService.createAttendanceForNext7Days(userId, finalShift);
            } catch (Exception e) {
                // Log lỗi nhưng không throw để không ảnh hưởng đến việc tạo UserAttendance
                // Lỗi này sẽ được scheduler tự động xử lý trong lần chạy tiếp theo
            }
        }

        return saved;
    }

    @Transactional
    public UserAttendance update(Long id, Boolean isActive, String shift) {
        UserAttendance userAttendance = repository.findById(id)
            .orElseThrow(() -> new IllegalArgumentException("Không tìm thấy bản ghi với ID: " + id));

        Boolean oldIsActive = userAttendance.getIsActive();
        String oldShift = userAttendance.getShift();
        
        if (shift != null) {
            String normalizedShift = normalizeShift(shift);
            userAttendance.setShift(normalizedShift);
            shift = normalizedShift; // Update shift variable for later use
        }
        
        if (isActive != null) {
            userAttendance.setIsActive(isActive);
            
            if (attendanceReportService != null) {
                Integer userId = userAttendance.getUser().getUserID();
                String currentShift = userAttendance.getShift() != null ? userAttendance.getShift() : "Ngày";
                
                // Lấy ngày hiện tại
                LocalDate today;
                if (timeService != null) {
                    today = timeService.nowVietnam().toLocalDate();
                } else {
                    today = LocalDate.now();
                }
                
                // Nếu chuyển từ true sang false (tắt theo dõi), xóa các bản ghi điểm danh từ hôm nay trở đi (7 ngày)
                if (oldIsActive != null && oldIsActive && !isActive) {
                    // Xóa từ ngày hiện tại đến 6 ngày sau
                    LocalDate startDate = today;
                    LocalDate endDate = today.plusDays(6);
                    
                    // Xóa các bản ghi điểm danh trong khoảng thời gian này
                    attendanceReportService.deleteByUserIdAndDateRange(userId, startDate, endDate);
                }
                // Nếu chuyển từ false sang true (bật lại theo dõi), tạo lại các bản ghi điểm danh trong tương lai (7 ngày)
                else if (oldIsActive != null && !oldIsActive && isActive) {
                    // Tạo lại điểm danh cho 7 ngày tiếp theo (từ hôm nay đến 6 ngày sau)
                    // Method này sẽ tự động skip những ngày đã tồn tại
                    attendanceReportService.createAttendanceForNext7Days(userId, currentShift);
                }
            }
        }
        
        // Nếu ca thay đổi và đang active, cần tạo lại điểm danh với ca mới
        if (shift != null && !shift.equals(oldShift) && userAttendance.getIsActive() && attendanceReportService != null) {
            Integer userId = userAttendance.getUser().getUserID();
            LocalDate today;
            if (timeService != null) {
                today = timeService.nowVietnam().toLocalDate();
            } else {
                today = LocalDate.now();
            }
            
            // Xóa các bản ghi cũ từ hôm nay đến 6 ngày sau
            LocalDate startDate = today;
            LocalDate endDate = today.plusDays(6);
            attendanceReportService.deleteByUserIdAndDateRange(userId, startDate, endDate);
            
            // Tạo lại với ca mới
            attendanceReportService.createAttendanceForNext7Days(userId, shift);
        }
        
        userAttendance.setUpdatedAt(LocalDateTime.now());

        return repository.save(userAttendance);
    }

    @Transactional
    public void delete(Long id) {
        if (!repository.existsById(id)) {
            throw new IllegalArgumentException("Không tìm thấy bản ghi với ID: " + id);
        }
        repository.deleteById(id);
    }

    @Transactional
    public void deleteByUserId(Integer userId) {
        Optional<UserAttendance> userAttendance = repository.findByUser_UserID(userId);
        if (userAttendance.isPresent()) {
            repository.delete(userAttendance.get());
        }
    }
}

