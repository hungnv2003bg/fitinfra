package com.foxconn.sopchecklist.config;

import com.foxconn.sopchecklist.entity.Users;
import com.foxconn.sopchecklist.entity.UserStatus;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.UserDetails;

import java.util.Collection;

public class UserPrincipal implements UserDetails {
    private Integer userId;
    private String manv;
    private String email;
    private String fullName;
    private String password;
    private UserStatus status;
    private Collection<? extends GrantedAuthority> authorities;

    public UserPrincipal(Integer userId, String manv, String email, String fullName, String password, UserStatus status, Collection<? extends GrantedAuthority> authorities) {
        this.userId = userId;
        this.manv = manv;
        this.email = email;
        this.fullName = fullName;
        this.password = password;
        this.status = status;
        this.authorities = authorities;
    }

    public static UserPrincipal create(Users user) {
        Collection<GrantedAuthority> authorities = user.getRoles().stream()
            .map(role -> new SimpleGrantedAuthority("ROLE_" + role.getName()))
            .collect(java.util.stream.Collectors.toList());

        return new UserPrincipal(
            user.getUserID(),
            user.getManv(),
            user.getEmail(),
            user.getFullName(),
            user.getPasswordHash(),
            user.getStatus(),
            authorities
        );
    }

    public Integer getUserId() {
        return userId;
    }

    public String getFullName() {
        return fullName;
    }

    public String getEmail() {
        return email;
    }

    @Override
    public String getUsername() {
        return manv;
    }

    @Override
    public String getPassword() {
        return password;
    }

    @Override
    public Collection<? extends GrantedAuthority> getAuthorities() {
        return authorities;
    }

    @Override
    public boolean isAccountNonExpired() {
        return true;
    }

    @Override
    public boolean isAccountNonLocked() {
        return true;
    }

    @Override
    public boolean isCredentialsNonExpired() {
        return true;
    }

    @Override
    public boolean isEnabled() {
        return status == UserStatus.ACTIVE;
    }
}

