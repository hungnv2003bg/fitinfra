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
public class SOPDocumentDTO {
    private Integer documentID;
    private String title;
    private String filePath;
    private Integer sopID;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}

