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

    // Liên kết tới bảng improvement_events
    @ManyToOne
    @JoinColumn(name = "improvement_event_id")
    @JsonIgnoreProperties({"improvements"})
    private ImprovementEvent improvementEvent;

    // Liên kết tới bản ghi chi tiết checklist (nếu có)
    @Column(name = "checklistDetailId")
    private String checklistDetailId;

    // Hạng mục (tên công việc từ checklist detail)
    @Column(name = "category", columnDefinition = "NVARCHAR(300)")
    private String category;

    // Nội dung công việc (từ phần cải thiện ở checklist detail)
    @Column(name = "issueDescription", columnDefinition = "NVARCHAR(MAX)")
    private String issueDescription;

    // Người phụ trách (từ checklist detail chỗ người thực hiện)
    @Column(name = "responsible")
    private String responsible; // lưu giống định dạng implementer ở checklist detail (group:ID hoặc user:ID)

    // Người phối hợp
    @ElementCollection
    @CollectionTable(name = "improvement_collaborators", joinColumns = @JoinColumn(name = "improvement_id"))
    @Column(name = "collaborator")
    private List<String> collaborators;

    // Đã loại bỏ reportedBy, assignedTo theo yêu cầu

    // Hành động cải thiện
    @Column(name = "actionPlan", columnDefinition = "NVARCHAR(MAX)")
    private String actionPlan;

    // Thời gian dự kiến hoàn thành
    @Column(name = "plannedDueAt")
    private LocalDateTime plannedDueAt;

    // Thời gian hoàn thành
    @Column(name = "completedAt")
    private LocalDateTime completedAt;

    // Ghi chú
    @Column(name = "note", columnDefinition = "NVARCHAR(MAX)")
    private String note;

    // Upload files
    @ElementCollection
    @CollectionTable(name = "improvement_files", joinColumns = @JoinColumn(name = "improvement_id"))
    private List<FileInfo> files;

    // Trạng thái
    @Column(length = 50)
    private String status;

    // Tiến độ (%)
    @Column(name = "progress")
    private Integer progress;

    // Nội dung tiến độ (mô tả chi tiết tiến độ hiện tại)
    @Column(name = "progressDetail", columnDefinition = "NVARCHAR(MAX)")
    private String progressDetail;

    // Người sửa cuối cùng
    @Column(name = "lastEditedBy")
    private Integer lastEditedBy;

    @Column(name = "lastEditedAt")
    private LocalDateTime lastEditedAt;

    private LocalDateTime createdAt = LocalDateTime.now();
}

