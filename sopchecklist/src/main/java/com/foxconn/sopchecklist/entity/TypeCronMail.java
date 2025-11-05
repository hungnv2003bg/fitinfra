package com.foxconn.sopchecklist.entity;

import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import javax.persistence.*;
import java.time.LocalDateTime;

/**
 * Bảng loại mail cron (SIGNUP, SOP, CHECKLISTDONE, etc.)
 */
@Entity
@Table(name = "type_cron_mail")
@Getter
@Setter
@AllArgsConstructor
@NoArgsConstructor
public class TypeCronMail {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "type_name", nullable = false, length = 50, unique = true)
    private String typeName;

    @Column(name = "description", length = 200)
    private String description;

    @Column(name = "enabled")
    private Boolean enabled = true;

    @Column(name = "created_at")
    private LocalDateTime createdAt;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;
}

