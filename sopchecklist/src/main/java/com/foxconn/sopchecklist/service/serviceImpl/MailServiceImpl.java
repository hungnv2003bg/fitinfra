package com.foxconn.sopchecklist.service.serviceImpl;

import com.foxconn.sopchecklist.entity.CronMail;
import com.foxconn.sopchecklist.entity.MailRecipient;
import com.foxconn.sopchecklist.repository.MailRecipientRepository;
import com.foxconn.sopchecklist.repository.MailRepository;
import com.foxconn.sopchecklist.service.MailService;
import com.foxconn.sopchecklist.service.TimeService;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.stream.Collectors;

@Service
public class MailServiceImpl implements MailService {

    private final MailRepository mailRepository;
    private final MailRecipientRepository mailRecipientRepository;
    private final TimeService timeService;

    @Value("${mail.default.to:}")
    private String defaultTo;

    @Value("${mail.default.cc:}")
    private String defaultCc;

    @Value("${mail.default.bcc:}")
    private String defaultBcc;

    public MailServiceImpl(MailRepository mailRepository,
                           MailRecipientRepository mailRecipientRepository,
                           TimeService timeService) {
        this.mailRepository = mailRepository;
        this.mailRecipientRepository = mailRecipientRepository;
        this.timeService = timeService;
    }

    private static String joinEmails(List<MailRecipient> recipients) {
        return recipients.stream()
                .map(MailRecipient::getEmail)
                .filter(e -> e != null && !e.trim().isEmpty())
                .collect(Collectors.joining(","));
    }

    @Override
    public CronMail createMail(String subject, String body) {
        // Load recipients from DB (enabled ones). Fallback to properties if empty.
        String toCsv = joinEmails(mailRecipientRepository.findByTypeAndEnabledTrue("TO"));
        String ccCsv = joinEmails(mailRecipientRepository.findByTypeAndEnabledTrue("CC"));
        String bccCsv = joinEmails(mailRecipientRepository.findByTypeAndEnabledTrue("BCC"));

        if (toCsv == null || toCsv.trim().isEmpty()) toCsv = defaultTo;
        if (ccCsv == null || ccCsv.trim().isEmpty()) ccCsv = defaultCc;
        if (bccCsv == null || bccCsv.trim().isEmpty()) bccCsv = defaultBcc;

        CronMail mail = new CronMail();
        mail.setMailTo(toCsv);
        mail.setMailCC(ccCsv);
        mail.setMailBCC(bccCsv);
        mail.setSubject(subject);
        mail.setBody(body);
        mail.setStatus("pending");
        mail.setRetryCount(0);
        mail.setLastError(null);
        mail.setCreatedAt(timeService.nowVietnam());
        return mailRepository.save(mail);
    }
}


