package com.foxconn.sopchecklist.repository;

import com.foxconn.sopchecklist.entity.UserAttendance;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface UserAttendanceRepository extends JpaRepository<UserAttendance, Long> {
    
    // Tìm theo user ID
    Optional<UserAttendance> findByUser_UserID(Integer userId);
    
    // Tìm tất cả user đang được theo dõi (isActive = true)
    List<UserAttendance> findByIsActiveTrue();
    
    // Kiểm tra user có đang được theo dõi không
    boolean existsByUser_UserIDAndIsActiveTrue(Integer userId);
}

