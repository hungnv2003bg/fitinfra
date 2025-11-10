package com.foxconn.sopchecklist.entity;

import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;

import javax.persistence.*;
import java.util.List;
import java.time.LocalDateTime;

@Entity
@Table(name = "Improvements")
@Getter
@Setter
@AllArgsConstructor
@NoArgsConstructor
public class Improvements {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer improvementID;

    @ManyToOne
    @JoinColumn(name = "checklistID", nullable = true)
    @JsonIgnoreProperties({"details"})
    private Checklists checklist;

    @ManyToOne
    @JoinColumn(name = "improvement_event_id")
    @JsonIgnoreProperties({"improvements"})
    private ImprovementEvent improvementEvent;

    @Column(name = "checklistDetailId")
    private String checklistDetailId;

    @Column(name = "category", columnDefinition = "NVARCHAR(300)")
    private String category;

    @Column(name = "issueDescription", columnDefinition = "NVARCHAR(MAX)")
    private String issueDescription;

    @ElementCollection
    @CollectionTable(name = "improvement_responsible", joinColumns = @JoinColumn(name = "improvement_id"))
    @Column(name = "responsible", columnDefinition = "NVARCHAR(500)")
    private List<String> responsible; 

    @ElementCollection
    @CollectionTable(name = "improvement_collaborators", joinColumns = @JoinColumn(name = "improvement_id"))
    @Column(name = "collaborator", columnDefinition = "NVARCHAR(500)")
    private List<String> collaborators;

    @Column(name = "actionPlan", columnDefinition = "NVARCHAR(MAX)")
    private String actionPlan;

    @Column(name = "plannedDueAt")
    private LocalDateTime plannedDueAt;

    @Column(name = "completedAt")
    private LocalDateTime completedAt;

    @Column(name = "note", columnDefinition = "NVARCHAR(MAX)")
    private String note;

    @ElementCollection
    @CollectionTable(name = "improvement_files", joinColumns = @JoinColumn(name = "improvement_id"))
    private List<FileInfo> files;

    @Column(name = "progress")
    private Integer progress;

    public void setProgress(Integer progress) {
        this.progress = progress;
    }
    public Integer getProgress() {
        return this.progress;
    }

    @Column(name = "status", length = 50, columnDefinition = "NVARCHAR(50)")
    private String status;

    @Column(name = "lastEditedBy")
    private Integer lastEditedBy;

    @Column(name = "lastEditedAt")
    private LocalDateTime lastEditedAt;

    @Column(name = "createdBy")
    private Integer createdBy;

    private LocalDateTime createdAt = LocalDateTime.now();
}

