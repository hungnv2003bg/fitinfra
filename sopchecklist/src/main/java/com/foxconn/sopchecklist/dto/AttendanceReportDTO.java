package com.foxconn.sopchecklist.dto;

import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDate;
import java.time.LocalTime;

@Getter
@Setter
@AllArgsConstructor
@NoArgsConstructor
public class AttendanceReportDTO {
    private Long id;
    private Integer userId;
    private String userName;
    private String userFullName;
    private LocalDate attendanceDate;
    private String status;
    private LocalTime clockInTime;
    private LocalTime clockOutTime;
    private String note;
}

