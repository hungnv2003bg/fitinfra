package com.foxconn.sopchecklist.service;

import com.foxconn.sopchecklist.entity.Improvements;

public interface MailImprovementReminderService {
    void queueImprovementReminderMail(Improvements improvement);
}

