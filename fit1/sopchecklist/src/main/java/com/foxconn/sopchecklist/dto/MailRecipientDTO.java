package com.foxconn.sopchecklist.dto;

import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter
@Setter
@AllArgsConstructor
@NoArgsConstructor
public class MailRecipientDTO {
    private Long id;
    private String email;
    private String type; // TO, CC, BCC
    private Boolean enabled;
    private String note;
    private Long checklistId;
}


