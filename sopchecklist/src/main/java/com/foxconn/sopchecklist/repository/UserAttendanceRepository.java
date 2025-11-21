package com.foxconn.sopchecklist.repository;

import com.foxconn.sopchecklist.entity.UserAttendance;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.util.List;
import java.util.Optional;

public interface UserAttendanceRepository extends JpaRepository<UserAttendance, Long> {
    
    // Tìm theo user ID
    Optional<UserAttendance> findByUser_UserID(Integer userId);
    
    // Tìm tất cả user đang được theo dõi (isActive = true)
    List<UserAttendance> findByIsActiveTrue();
    
    // Kiểm tra user có đang được theo dõi không
    boolean existsByUser_UserIDAndIsActiveTrue(Integer userId);
    
    /**
     * Tìm tất cả UserAttendance và sắp xếp: isActive = true trước, sau đó theo createdAt (tạo trước ở trên)
     */
    @Query("SELECT ua FROM UserAttendance ua ORDER BY " +
           "CASE WHEN ua.isActive = true THEN 0 ELSE 1 END, " +
           "ua.createdAt ASC")
    List<UserAttendance> findAllOrderedByIsActiveAndCreatedAt();
}

