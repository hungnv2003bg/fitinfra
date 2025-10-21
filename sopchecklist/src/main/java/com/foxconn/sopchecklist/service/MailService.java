package com.foxconn.sopchecklist.service;

import com.foxconn.sopchecklist.entity.CronMail;

public interface MailService {
    CronMail createMail(String subject, String body);
}


