package com.foxconn.sopchecklist.entity;

import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import com.fasterxml.jackson.annotation.JsonManagedReference;

import javax.persistence.*;
import java.time.LocalDateTime;
import java.util.List;

@Entity
@Table(name = "Checklist_Details",
       uniqueConstraints = @UniqueConstraint(name = "uk_checklist_implementer_scheduled",
               columnNames = {"checklist_id", "implementer", "scheduled_at"}))
@Getter
@Setter
@AllArgsConstructor
@NoArgsConstructor
public class ChecklistDetail {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(optional = false)
    @JoinColumn(name = "checklist_id")
    private Checklists checklist;

    // Lấy từ checklist
    @Column(name = "task_name", nullable = false, columnDefinition = "NVARCHAR(200)")
    private String taskName;

    // Lấy từ checklist
    @Column(name = "work_content", columnDefinition = "NVARCHAR(MAX)")
    private String workContent;

    // Lấy từ checklist
    @Column(name = "implementer", nullable = false, columnDefinition = "NVARCHAR(100)")
    private String implementer;

    @Column(name = "scheduled_at", nullable = false)
    private LocalDateTime scheduledAt;

    @Column(name = "created_at")
    private LocalDateTime createdAt = LocalDateTime.now();

    @Column(name = "deadline_at")
    private LocalDateTime deadlineAt;

    @Column(name = "last_edited_by")
    private Long lastEditedBy;

    @Column(name = "last_edited_at")
    private LocalDateTime lastEditedAt;

    @Column(name = "status", columnDefinition = "NVARCHAR(50)")
    private String status = "IN_PROGRESS";

    // Đường dẫn/tên file upload (nếu có)
    @Column(name = "upload_file", columnDefinition = "NVARCHAR(255)")
    private String uploadFile;

    @Column(name = "note", columnDefinition = "NVARCHAR(MAX)")
    private String note;

    @Column(name = "abnormal_info", columnDefinition = "NVARCHAR(MAX)")
    private String abnormalInfo;

    @OneToMany(mappedBy = "checklistDetail", cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.LAZY)
    @JsonManagedReference
    private List<ChecklistDetailFiles> files;
}