package com.foxconn.sopchecklist.entity;

import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import javax.persistence.*;

@Entity
@Table(name = "sopdocument_permissions")
@Getter
@Setter
@AllArgsConstructor
@NoArgsConstructor
public class SOPDocumentPermission {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;


    @Column(name = "sop_id")
    private Long sopId;

    @Column(name = "document_id")
    private Integer documentId;

    @Column(name = "group_id")
    private Long groupId;

    @Column(name = "user_id")
    private Long userId;

    @Column(name = "can_view")
    private boolean view;

    @Column(name = "can_edit")
    private boolean edit;

    @Column(name = "can_delete")
    private boolean del;

    @Column(name = "can_create")
    private boolean create;
}