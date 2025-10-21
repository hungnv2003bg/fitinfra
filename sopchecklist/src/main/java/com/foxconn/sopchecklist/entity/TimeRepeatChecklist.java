package com.foxconn.sopchecklist.entity;

import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import javax.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "Time_Repeat_Checklist")
@Getter
@Setter
@AllArgsConstructor
@NoArgsConstructor
public class TimeRepeatChecklist {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    // Số lượng đơn vị lặp lại: 1,2,3,4,5,6,7
    private Integer number;

    // Đơn vị: day, week, month, year
    @Column(length = 16)
    private String unit;

    private LocalDateTime createdAt = LocalDateTime.now();
}


