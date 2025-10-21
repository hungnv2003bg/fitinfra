package com.foxconn.sopchecklist.entity;

import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import com.fasterxml.jackson.annotation.JsonBackReference;

import javax.persistence.*;

@Entity
@Table(name = "checklist_detail_files")
@Getter
@Setter
@AllArgsConstructor
@NoArgsConstructor
public class ChecklistDetailFiles {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne
    @JoinColumn(name = "checklist_detail_id", nullable = false)
    @JsonBackReference
    private ChecklistDetail checklistDetail;

    @Column(name = "file_path", nullable = false, columnDefinition = "NVARCHAR(1000)")
    private String filePath;

    @Column(name = "file_name", nullable = false, columnDefinition = "NVARCHAR(400)")
    private String fileName;

    @Column(name = "file_type", columnDefinition = "NVARCHAR(50)")
    private String fileType;

    @Column(name = "file_size")
    private Long fileSize;

    @Column(name = "created_at")
    private java.time.LocalDateTime createdAt;
}
