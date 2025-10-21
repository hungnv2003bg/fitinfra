package com.foxconn.sopchecklist.service;

import com.foxconn.sopchecklist.entity.MailRecipient;
import java.util.List;

public interface MailRecipientService {
    MailRecipient add(MailRecipient r);
    MailRecipient update(Long id, MailRecipient r);
    void delete(Long id);
    List<MailRecipient> listAll();
    List<MailRecipient> listEnabled();
    void replaceAll(String mailToCsv, String mailCcCsv, String mailBccCsv);
}


