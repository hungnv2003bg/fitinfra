package com.foxconn.sopchecklist.service;

import com.foxconn.sopchecklist.entity.CronMailAll;
import com.foxconn.sopchecklist.entity.ChecklistDetail;

public interface MailChecklistService {
    
    CronMailAll queueChecklistDetailMail(ChecklistDetail detail);

    CronMailAll queueChecklistReminderMail(ChecklistDetail detail);
}