package com.foxconn.sopchecklist.dto;

import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import javax.validation.constraints.NotBlank;

@Getter
@Setter
@AllArgsConstructor
@NoArgsConstructor
public class SOPCreateRequest {
    
    @NotBlank(message = "Tên SOP không được để trống")
    private String name;
    
    private Integer createdBy;
}

