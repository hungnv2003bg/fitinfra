package com.foxconn.sopchecklist.entity;

import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import javax.persistence.*;
import java.time.LocalDateTime;
import java.util.List;
import javax.persistence.Transient;

@Entity
@Table(name = "Checklists")
@Getter
@Setter
@AllArgsConstructor
@NoArgsConstructor
public class Checklists {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, columnDefinition = "NVARCHAR(200)")
    private String taskName;

    @Column(columnDefinition = "NVARCHAR(MAX)")
    private String workContent;

    private LocalDateTime createdAt = LocalDateTime.now();

    @Column(name = "creator")
    private Long creator;

    private LocalDateTime lastEditedAt;

    @Column(name = "last_edited_by")
    private Long lastEditedBy;

    @ElementCollection
    @CollectionTable(name = "Checklist_Implementers", joinColumns = @JoinColumn(name = "checklist_id"))
    @Column(name = "implementer", columnDefinition = "NVARCHAR(100)")
    private List<String> implementers; 

    private LocalDateTime startAt; 

    private Long repeatId; 

    private Integer dueInDays;

    private Integer sopDocumentId;

    @Column(name = "status", columnDefinition = "NVARCHAR(50)", nullable = false)
    private String status = "ACTIVE";

    @Column(name = "schedule_updated_at")
    private LocalDateTime scheduleUpdatedAt;

    @Transient
    private LocalDateTime nextScheduledAt;

    @Transient
    private java.util.List<LocalDateTime> nextThreeScheduled;
}

