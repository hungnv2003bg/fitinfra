package com.foxconn.sopchecklist.entity;

import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import org.hibernate.annotations.Nationalized;

import javax.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "User_Attendance",
       uniqueConstraints = @UniqueConstraint(name = "uk_user_attendance_user",
               columnNames = {"user_id"}))
@Getter
@Setter
@AllArgsConstructor
@NoArgsConstructor
public class UserAttendance {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(optional = false)
    @JoinColumn(name = "user_id", nullable = false, unique = true)
    @JsonIgnoreProperties({"roles", "passwordHash"})
    private Users user;

    @Column(name = "is_active", nullable = false)
    private Boolean isActive = true; // Có đang theo dõi điểm danh không

    @Nationalized
    @Column(name = "shift", nullable = false, length = 10, columnDefinition = "NVARCHAR(10)")
    private String shift = "Ngày"; // Ca làm việc: "Ngày" hoặc "Đêm"

    @Column(name = "created_at")
    private LocalDateTime createdAt = LocalDateTime.now();

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;
}

