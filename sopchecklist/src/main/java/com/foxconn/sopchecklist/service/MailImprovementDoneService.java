package com.foxconn.sopchecklist.service;

import com.foxconn.sopchecklist.entity.Improvements;

public interface MailImprovementDoneService {
    void queueImprovementDoneMail(Improvements improvement);
}

