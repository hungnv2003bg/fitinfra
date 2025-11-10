package com.foxconn.sopchecklist.dto;

import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDateTime;

@Getter
@Setter
@AllArgsConstructor
@NoArgsConstructor
public class SOPDTO {
    private Long id;
    private String name;
    private String createdBy;
    private String lastEditedBy;
    private LocalDateTime createdAt;
    private LocalDateTime lastEditedAt;
    private Integer documentCount;
    private Boolean userCanView;
    private Boolean userCanEdit;
    private Boolean userCanDelete;
    private Boolean userCanCreate;
}

