package com.foxconn.sopchecklist.entity;

import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.hibernate.annotations.Nationalized;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;

import javax.persistence.*;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;

@Entity
@Table(name = "Attendance_Report",
       uniqueConstraints = @UniqueConstraint(name = "uk_attendance_user_date",
               columnNames = {"user_id", "attendance_date"}))
@Getter
@Setter
@AllArgsConstructor
@NoArgsConstructor
public class AttendanceReport {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(optional = false)
    @JoinColumn(name = "user_id", nullable = false)
    @JsonIgnoreProperties({"roles", "passwordHash"})
    private Users user;

    @Column(name = "attendance_date", nullable = false)
    private LocalDate attendanceDate;

    @Nationalized
    @Column(name = "status", nullable = false, columnDefinition = "NVARCHAR(50)")
    private String status; // Có mặt, Nửa ngày, Vắng, Đi muộn, Nghỉ phép

    @Column(name = "clock_in_time")
    private LocalTime clockInTime; // Giờ vào

    @Column(name = "clock_out_time")
    private LocalTime clockOutTime; // Giờ ra

    @Nationalized
    @Column(name = "note", columnDefinition = "NVARCHAR(MAX)")
    private String note; // Ghi chú

    @Nationalized
    @Column(name = "shift", length = 10, columnDefinition = "NVARCHAR(10)")
    private String shift; // Ca làm việc: "Ngày" hoặc "Đêm"

    @Column(name = "created_at")
    private LocalDateTime createdAt = LocalDateTime.now();

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;
}

