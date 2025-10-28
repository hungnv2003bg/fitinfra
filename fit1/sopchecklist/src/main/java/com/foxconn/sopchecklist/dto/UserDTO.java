package com.foxconn.sopchecklist.dto;

import com.foxconn.sopchecklist.entity.Role;
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
public class UserDTO {
    private Integer userID;
    private String fullName;
    private String email;
    private Set<Role> roles;
    private LocalDateTime createdAt;
}

