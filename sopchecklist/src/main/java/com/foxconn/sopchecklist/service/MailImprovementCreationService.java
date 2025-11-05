package com.foxconn.sopchecklist.service;

import com.foxconn.sopchecklist.entity.ChecklistDetail;
import com.foxconn.sopchecklist.entity.Improvements;

public interface MailImprovementCreationService {
    void queueImprovementCreatedMail(ChecklistDetail sourceDetail, Improvements improvement);
}


