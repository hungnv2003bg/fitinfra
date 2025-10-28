package com.foxconn.sopchecklist.entity;

import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import javax.persistence.*;
import com.fasterxml.jackson.annotation.JsonIgnore;
import java.time.LocalDateTime;

@Entity
@Table(name = "mail_recipient_all")
@Getter
@Setter
@AllArgsConstructor
@NoArgsConstructor
public class MailRecipientAll {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "email", nullable = false, length = 320)
    private String email;

    @Column(name = "type", nullable = false, length = 10)
    private String type; 

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "type_mail_recipient_id", nullable = false)
    private TypeMailRecipient typeMailRecipient; 

    @Column(name = "checklist_id")
    private Long checklistId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "checklist_id", insertable = false, updatable = false)
    @JsonIgnore
    private Checklists checklist;

    @Column(name = "enabled")
    private Boolean enabled = true;

    @Column(name = "note", columnDefinition = "NVARCHAR(500)")
    private String note;

    @Column(name = "created_at")
    private LocalDateTime createdAt;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;
}
