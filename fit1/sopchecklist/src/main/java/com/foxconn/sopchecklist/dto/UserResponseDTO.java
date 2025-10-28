package com.foxconn.sopchecklist.dto;

import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDateTime;
import java.util.Set;

@Getter
@Setter
@AllArgsConstructor
@NoArgsConstructor
public class UserResponseDTO {
    private Integer userID;
    private String fullName;
    private String email;
    private String username;
    private String phone;
    private Set<RoleDTO> roles;
    private LocalDateTime createdAt;
}

