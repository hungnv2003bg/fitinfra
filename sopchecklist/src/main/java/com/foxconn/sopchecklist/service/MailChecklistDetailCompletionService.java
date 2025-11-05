package com.foxconn.sopchecklist.service;

import com.foxconn.sopchecklist.entity.ChecklistDetail;

public interface MailChecklistDetailCompletionService {
    /**
     * Gửi mail thông báo khi checklist detail được hoàn thành
     * @param detail ChecklistDetail đã hoàn thành
     */
    void queueChecklistDetailCompletionMail(ChecklistDetail detail);
}
