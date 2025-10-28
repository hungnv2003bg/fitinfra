package com.foxconn.sopchecklist.service;

import com.foxconn.sopchecklist.entity.MailRecipientAll;

import java.util.List;

public interface MailRecipientAllService {
    MailRecipientAll add(MailRecipientAll r);
    MailRecipientAll update(Long id, MailRecipientAll r);
    void delete(Long id);
    List<MailRecipientAll> listAll();
    List<MailRecipientAll> listEnabled();
    List<MailRecipientAll> findByTypeAndEnabledTrue(String type);
    List<MailRecipientAll> findByTypeMailRecipientTypeNameAndEnabledTrue(String typeName);
    void replaceAll(String mailToCsv, String mailCcCsv, String mailBccCsv);
    void replaceAllByEventType(String eventTypeName, String mailToCsv, String mailCcCsv, String mailBccCsv);
}
