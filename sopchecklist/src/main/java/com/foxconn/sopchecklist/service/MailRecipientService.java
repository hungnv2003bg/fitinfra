package com.foxconn.sopchecklist.service;

import com.foxconn.sopchecklist.entity.MailRecipientAll;

import java.util.List;

public interface MailRecipientService {
    /**
     * Lấy danh sách người nhận mail theo loại sự kiện và vai trò
     * @param eventType Loại sự kiện (checklistdone, signup, improvementdone, etc.)
     * @param mailType Vai trò mail (TO, CC, BCC)
     * @return Danh sách email người nhận
     */
    List<String> getRecipientsByEventAndType(String eventType, String mailType);
    
    /**
     * Lấy danh sách người nhận TO cho một loại sự kiện
     */
    List<String> getToRecipients(String eventType);
    
    /**
     * Lấy danh sách người nhận CC cho một loại sự kiện
     */
    List<String> getCcRecipients(String eventType);
    
    /**
     * Lấy danh sách người nhận BCC cho một loại sự kiện
     */
    List<String> getBccRecipients(String eventType);
    
    /**
     * Thêm người nhận mail cho một loại sự kiện cụ thể
     */
    MailRecipientAll addRecipient(String email, String eventType, String mailType, String note);
    
    /**
     * Xóa tất cả người nhận của một loại sự kiện
     */
    void clearRecipientsByEvent(String eventType);
}