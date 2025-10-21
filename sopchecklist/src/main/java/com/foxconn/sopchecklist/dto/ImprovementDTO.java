package com.foxconn.sopchecklist.dto;

import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDateTime;

@Getter
@Setter
@AllArgsConstructor
@NoArgsConstructor
public class ImprovementDTO {
    private Integer improvementID;
    private Integer checklistID;
    private String issueDescription;
    private Integer reportedBy;
    private Integer assignedTo;
    private LocalDateTime deadline;
    private String status;
    private LocalDateTime createdAt;
    private Long improvementEventId;
    private String improvementEventName;
}

