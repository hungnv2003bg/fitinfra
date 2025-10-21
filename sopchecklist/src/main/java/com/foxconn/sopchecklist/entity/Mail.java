package com.foxconn.sopchecklist.entity;

import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import javax.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "mail")
@Getter
@Setter
@AllArgsConstructor
@NoArgsConstructor
public class Mail {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "mailto", columnDefinition = "NVARCHAR(500)")
    private String mailTo;

    @Column(name = "mailcc", columnDefinition = "NVARCHAR(500)")
    private String mailCC;

    @Column(name = "mailbcc", columnDefinition = "NVARCHAR(500)")
    private String mailBCC;

    @Column(name = "subject", columnDefinition = "NVARCHAR(1000)")
    private String subject;

    @Column(name = "body", columnDefinition = "NVARCHAR(MAX)")
    private String body;

    @Column(name = "status", columnDefinition = "NVARCHAR(20)")
    private String status;

    @Column(name = "retry_count")
    private Integer retryCount;

    @Column(name = "last_error", columnDefinition = "NVARCHAR(1000)")
    private String lastError;

    @Column(name = "created_at")
    private LocalDateTime createdAt;
}


