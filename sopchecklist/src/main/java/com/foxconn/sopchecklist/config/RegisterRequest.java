package com.foxconn.sopchecklist.config;

import java.util.List;

public class RegisterRequest {
    private String fullName;
    private String email;
    private String manv;
    private String phone;
    private String password;
    private List<Long> groupIds;

    // Default constructor
    public RegisterRequest() {
    }

    // Constructor with parameters
    public RegisterRequest(String fullName, String email, String manv, String phone, String password, List<Long> groupIds) {
        this.fullName = fullName;
        this.email = email;
        this.manv = manv;
        this.phone = phone;
        this.password = password;
        this.groupIds = groupIds;
    }

    // Getters and Setters
    public String getFullName() {
        return fullName;
    }

    public void setFullName(String fullName) {
        this.fullName = fullName;
    }

    public String getEmail() {
        return email;
    }

    public void setEmail(String email) {
        this.email = email;
    }

    public String getManv() {
        return manv;
    }

    public void setManv(String manv) {
        this.manv = manv;
    }

    public String getPhone() {
        return phone;
    }

    public void setPhone(String phone) {
        this.phone = phone;
    }

    public String getPassword() {
        return password;
    }

    public void setPassword(String password) {
        this.password = password;
    }

    public List<Long> getGroupIds() {
        return groupIds;
    }

    public void setGroupIds(List<Long> groupIds) {
        this.groupIds = groupIds;
    }

    @Override
    public String toString() {
        return "RegisterRequest{" +
                "fullName='" + fullName + '\'' +
                ", email='" + email + '\'' +
                ", manv='" + manv + '\'' +
                ", phone='" + phone + '\'' +
                ", password='[PROTECTED]'" +
                ", groupIds=" + groupIds +
                '}';
    }
}