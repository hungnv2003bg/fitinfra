package com.foxconn.sopchecklist.entity;

import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import javax.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "mail_recipient")
@Getter
@Setter
@AllArgsConstructor
@NoArgsConstructor
public class MailRecipient {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    // Email address
    @Column(name = "email", nullable = false, length = 320)
    private String email;

    // Type: TO | CC | BCC
    @Column(name = "type", nullable = false, length = 10)
    private String type;

    // Whether this recipient is active
    @Column(name = "enabled")
    private Boolean enabled = true;

    // Optional note
    @Column(name = "note", columnDefinition = "NVARCHAR(500)")
    private String note;

    @Column(name = "created_at")
    private LocalDateTime createdAt;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;
}


