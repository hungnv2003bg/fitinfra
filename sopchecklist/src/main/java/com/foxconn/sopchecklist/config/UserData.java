package com.foxconn.sopchecklist.config;

import com.foxconn.sopchecklist.entity.Users;

import java.util.List;

public class UserData {
    private Users nguoiDung;
    private String token;
    private List<String> quyenList;
    private String refreshToken;

    public UserData(Users nguoiDung, String token, List<String> quyenList) {
        this.nguoiDung = nguoiDung;
        this.token = token;
        this.quyenList = quyenList;
    }

    public UserData(Users nguoiDung, String token, List<String> quyenList, String refreshToken) {
        this.nguoiDung = nguoiDung;
        this.token = token;
        this.quyenList = quyenList;
        this.refreshToken = refreshToken;
    }

    public Users getNguoiDung() {
        return nguoiDung;
    }

    public void setNguoiDung(Users nguoiDung) {
        this.nguoiDung = nguoiDung;
    }

    public String getToken() {
        return token;
    }

    public void setToken(String token) {
        this.token = token;
    }

    public List<String> getQuyenList() {
        return quyenList;
    }

    public void setQuyenList(List<String> quyenList) {
        this.quyenList = quyenList;
    }

    public String getRefreshToken() {
        return refreshToken;
    }

    public void setRefreshToken(String refreshToken) {
        this.refreshToken = refreshToken;
    }
}

