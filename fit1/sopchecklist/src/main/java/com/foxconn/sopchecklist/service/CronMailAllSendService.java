package com.foxconn.sopchecklist.service;

import com.foxconn.sopchecklist.entity.CronMailAll;
import com.foxconn.sopchecklist.entity.MailRecipientAll;
import com.foxconn.sopchecklist.entity.TypeCronMail;
import com.foxconn.sopchecklist.repository.CronMailAllRepository;
import com.foxconn.sopchecklist.repository.MailRecipientAllRepository;
import com.foxconn.sopchecklist.repository.TypeCronMailRepository;
import com.foxconn.sopchecklist.service.TimeService;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.stream.Collectors;

/**
 * Service thống nhất để gửi mail cho tất cả các loại (SOPs, Signup, ChecklistDone, etc.)
 * Tất cả mail được lưu vào bảng cron_mail_all với type_id tương ứng
 */
@Service
public class CronMailAllSendService {

    private final CronMailAllRepository mailRepository;
    private final MailRecipientAllRepository mailRecipientRepository;
    private final TypeCronMailRepository typeCronMailRepository;
    private final TimeService timeService;

    public CronMailAllSendService(CronMailAllRepository mailRepository,
                                  MailRecipientAllRepository mailRecipientRepository,
                                  TypeCronMailRepository typeCronMailRepository,
                                  TimeService timeService) {
        this.mailRepository = mailRepository;
        this.mailRecipientRepository = mailRecipientRepository;
        this.typeCronMailRepository = typeCronMailRepository;
        this.timeService = timeService;
    }

    /**
     * Gửi mail cho SOPs (SOP creation/update notifications)
     */
    public CronMailAll sendSOPSMail(String subject, String body, Long referenceId) {
        return sendMail("SOP", subject, body, referenceId);
    }

    /**
     * Gửi mail cho ChecklistDone (Checklist completion notifications)
     */
    public CronMailAll sendChecklistDoneMail(String subject, String body, Long referenceId) {
        return sendMail("CHECKLISTDONE", subject, body, referenceId);
    }

    /**
     * Gửi mail cho Signup (User registration notifications)
     */
    public CronMailAll sendSignupMail(String subject, String body, Long referenceId) {
        return sendMail("SIGNUP", subject, body, referenceId);
    }

    /**
     * Gửi mail tổng quát với type name
     */
    private CronMailAll sendMail(String typeName, String subject, String body, Long referenceId) {
        try {
            // Tìm hoặc tạo TypeCronMail
            TypeCronMail type = typeCronMailRepository.findByTypeName(typeName);
            if (type == null) {
                type = new TypeCronMail();
                type.setTypeName(typeName);
                type.setDescription("Mail type: " + typeName);
                type.setEnabled(true);
                type.setCreatedAt(timeService.nowVietnam());
                type.setUpdatedAt(timeService.nowVietnam());
                type = typeCronMailRepository.save(type);
            }

            // Lấy recipients từ mail_recipient_all
            String toCsv = getRecipients(typeName, "TO");
            String ccCsv = getRecipients(typeName, "CC");
            String bccCsv = getRecipients(typeName, "BCC");

            // Nếu không có recipients, skip
            if ((toCsv == null || toCsv.trim().isEmpty()) &&
                (ccCsv == null || ccCsv.trim().isEmpty()) &&
                (bccCsv == null || bccCsv.trim().isEmpty())) {
                return null;
            }

            CronMailAll mail = new CronMailAll();
            mail.setTypeId(type.getId());
            mail.setMailTo(toCsv != null ? toCsv : "");
            mail.setMailCC(ccCsv != null ? ccCsv : "");
            mail.setMailBCC(bccCsv != null ? bccCsv : "");
            mail.setSubject(subject != null ? subject : "");
            mail.setBody(body != null ? body : "");
            mail.setStatus("PENDING");
            mail.setRetryCount(0);
            mail.setLastError(null);
            mail.setCreatedAt(timeService.nowVietnam());
            mail.setReferenceId(referenceId);

            return mailRepository.save(mail);
        } catch (Exception e) {
            System.err.println("Error in sendMail for type " + typeName + ": " + e.getMessage());
            return null;
        }
    }

    private String getRecipients(String typeName, String recipientType) {
        try {
            List<MailRecipientAll> recipients = mailRecipientRepository
                .findByTypeAndTypeMailRecipientTypeNameAndEnabledTrue(recipientType, typeName);
            return recipients.stream()
                .map(MailRecipientAll::getEmail)
                .filter(e -> e != null && !e.trim().isEmpty())
                .collect(Collectors.joining(","));
        } catch (Exception e) {
            return "";
        }
    }
}

