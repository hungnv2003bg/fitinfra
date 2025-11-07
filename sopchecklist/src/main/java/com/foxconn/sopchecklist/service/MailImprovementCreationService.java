package com.foxconn.sopchecklist.service;

import com.foxconn.sopchecklist.entity.ChecklistDetail;
import com.foxconn.sopchecklist.entity.Improvements;

public interface MailImprovementCreationService {
    void queueImprovementCreatedMail(ChecklistDetail sourceDetail, Improvements improvement);
    
    /**
     * Send email notification when improvement is created directly (not from checklist)
     * @param improvement The newly created improvement
     */
    void queueDirectImprovementCreationMail(Improvements improvement);
}


