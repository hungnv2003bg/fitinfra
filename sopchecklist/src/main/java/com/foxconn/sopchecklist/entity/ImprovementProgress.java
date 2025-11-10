package com.foxconn.sopchecklist.entity;

import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import javax.persistence.*;
import com.fasterxml.jackson.annotation.JsonIgnore;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import java.time.LocalDateTime;

@Entity
@Table(name = "improvement_progress")
@Getter
@Setter
@AllArgsConstructor
@NoArgsConstructor
public class ImprovementProgress {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "improvement_id", nullable = false)
    @JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
    @JsonIgnore
    private Improvements improvement;

    @Column(name = "progress_percent")
    private Integer progressPercent; 

    @Column(name = "progress_detail", columnDefinition = "NVARCHAR(MAX)")
    private String progressDetail;

  @Column(name = "status")
  private Integer status;

    @Column(name = "created_by")
    private Integer createdBy;

    @Column(name = "updated_by")
    private Integer updatedBy;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @Column(name = "created_at")
    private LocalDateTime createdAt = LocalDateTime.now();
}


