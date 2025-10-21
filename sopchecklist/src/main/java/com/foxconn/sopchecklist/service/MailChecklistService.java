package com.foxconn.sopchecklist.service;

import com.foxconn.sopchecklist.entity.ChecklistCronMail;
import com.foxconn.sopchecklist.entity.ChecklistDetail;

public interface MailChecklistService {
    
    ChecklistCronMail queueChecklistDetailMail(ChecklistDetail detail);
}