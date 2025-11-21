package com.foxconn.sopchecklist.service.serviceImpl;

import com.foxconn.sopchecklist.entity.ChecklistDetail;
import com.foxconn.sopchecklist.entity.CronMailAll;
import com.foxconn.sopchecklist.entity.Group;
import com.foxconn.sopchecklist.entity.MailRecipientAll;
import com.foxconn.sopchecklist.entity.TypeCronMail;
import com.foxconn.sopchecklist.entity.Users;
import com.foxconn.sopchecklist.entity.UserStatus;
import com.foxconn.sopchecklist.repository.ChecklistDetailRepository;
import com.foxconn.sopchecklist.repository.CronMailAllRepository;
import com.foxconn.sopchecklist.repository.GroupRepository;
import com.foxconn.sopchecklist.repository.MailRecipientAllRepository;
import com.foxconn.sopchecklist.repository.TypeCronMailRepository;
import com.foxconn.sopchecklist.repository.UsersRepository;
import com.foxconn.sopchecklist.service.MailChecklistDetailCompletionService;
import com.foxconn.sopchecklist.service.TimeService;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.stream.Collectors;

@Service
public class MailChecklistDetailCompletionServiceImpl implements MailChecklistDetailCompletionService {

    private final ChecklistDetailRepository checklistDetailRepository;
    private final GroupRepository groupRepository;
    private final UsersRepository usersRepository;
    private final CronMailAllRepository cronMailAllRepository;
    private final MailRecipientAllRepository mailRecipientAllRepository;
    private final TypeCronMailRepository typeCronMailRepository;
    private final TimeService timeService;

    @Value("${app.public.url:http://10.228.64.77:3000}")
    private String appPublicUrl;
    
    @Value("${app.backend.url:http://10.228.64.77:8081}")
    private String appBackendUrl;

    public MailChecklistDetailCompletionServiceImpl(ChecklistDetailRepository checklistDetailRepository,
                                                   GroupRepository groupRepository,
                                                   UsersRepository usersRepository,
                                                   CronMailAllRepository cronMailAllRepository,
                                                   MailRecipientAllRepository mailRecipientAllRepository,
                                                   TypeCronMailRepository typeCronMailRepository,
                                                   TimeService timeService) {
        this.checklistDetailRepository = checklistDetailRepository;
        this.groupRepository = groupRepository;
        this.usersRepository = usersRepository;
        this.cronMailAllRepository = cronMailAllRepository;
        this.mailRecipientAllRepository = mailRecipientAllRepository;
        this.typeCronMailRepository = typeCronMailRepository;
        this.timeService = timeService;
    }

    @Override
    public void queueChecklistDetailCompletionMail(ChecklistDetail detail) {
        if (detail == null) return;
        
        // Load checklist detail với files để đảm bảo có đầy đủ thông tin
        Long detailId = detail.getId();
        ChecklistDetail fullDetail = detailId != null
                ? checklistDetailRepository.findById(detailId).orElse(detail)
                : detail;
        
        String subject = buildCompletionSubject(fullDetail);
        String body = buildCompletionBody(fullDetail);

        // Gửi mail cho 3 nhóm người nhận:
        // 1. Người thực hiện (implementer)
        // 2. Danh sách mail trong cài đặt "Thông báo nhận mail hoàn thành checklist"
        // 3. Danh sách mail từ biểu tượng mail trong checklist (CHECKLIST type)
        
        sendMailToImplementer(subject, body, fullDetail);
        sendMailToChecklistCompletionRecipients(subject, body, fullDetail);
        sendMailToChecklistRecipients(subject, body, fullDetail);
    }

    private String buildCompletionSubject(ChecklistDetail d) {
        String task = d.getTaskName() != null ? d.getTaskName() : "Checklist";
        return "Thông báo hoàn thành checklist / 通知完成清单: " + task;
    }

    private String buildCompletionBody(ChecklistDetail d) {
        DateTimeFormatter fmt = DateTimeFormatter.ofPattern("dd/MM/yyyy HH:mm");
        String task = safe(d.getTaskName());
        String content = safe(d.getWorkContent());
        String implementer = getImplementerDisplay(d.getImplementer());
        String completed = d.getLastEditedAt() != null ? d.getLastEditedAt().format(fmt) : "";
        String deadline = d.getDeadlineAt() != null ? d.getDeadlineAt().format(fmt) : "";
        String note = safe(d.getNote());
        String abnormalInfo = safe(d.getAbnormalInfo());

        StringBuilder body = new StringBuilder();
        body.append("<div style=\"font-family:Arial,Helvetica,sans-serif;color:#333;line-height:1.6;\">");
        body.append("<h2 style=\"margin:0 0 12px;color:#28a745;\">✓ Công việc đã hoàn thành / 工作已完成</h2>");
        body.append("<table style=\"border-collapse:collapse;width:100%;\">");
        row(body, "Tên công việc / 工作名称", task);
        row(body, "Nội dung công việc / 工作内容", content);
        row(body, "Người thực hiện / 执行人", implementer);
        row(body, "Thời gian hoàn thành / 完成时间", completed);
        row(body, "Hạn hoàn thành / 完成期限", deadline);
        row(body, "Trạng thái / 状态", "✅ Hoàn thành / 已完成");
        
        if (note != null && !note.trim().isEmpty()) {
            row(body, "Ghi chú / 备注", note);
        }
        
        if (abnormalInfo != null && !abnormalInfo.trim().isEmpty()) {
            row(body, "Thông tin bất thường / 异常信息", abnormalInfo);
        }
        
        // Thêm thông tin về files đính kèm
        String attachedFiles = getAttachedFilesInfo(d);
        if (attachedFiles != null && !attachedFiles.trim().isEmpty()) {
            rowHtml(body, "Tệp đính kèm / 附件", attachedFiles);
        }
        
        body.append("</table>");

        // Deep link tới trang checklist detail cụ thể
        try {
            String appBase = appPublicUrl;
            Long detailId = d.getId();
            if (detailId != null) {
                String link = appBase + "/checklist-detail/" + detailId;
                body.append("<p style=\"margin-top:12px;\"><a href=\"")
                        .append(link)
                        .append("\" style=\"display:inline-block;background:#28a745;color:#fff;padding:8px 12px;border-radius:4px;text-decoration:none;\">Xem chi tiết checklist / 查看清单详情</a></p>");
            }
        } catch (Exception ignore) {}

        body.append("<p><strong>Trân trọng / 此致,</strong></p>");
        body.append("<p><em>Hệ thống IT Management / IT管理系统</em></p>");
        body.append("</div>");
        return body.toString();
    }

    private static void row(StringBuilder body, String name, String value) {
        body.append("<tr>");
        body.append("<td style=\"border:1px solid #ddd;padding:8px;background:#f5f5f5;\">").append(name).append("</td>");
        body.append("<td style=\"border:1px solid #ddd;padding:8px;\">").append(escapeHtml(value)).append("</td>");
        body.append("</tr>");
    }

    // Row với HTML content (không escape value)
    private static void rowHtml(StringBuilder body, String name, String htmlValue) {
        body.append("<tr>");
        body.append("<td style=\"border:1px solid #ddd;padding:8px;background:#f5f5f5;\">").append(name).append("</td>");
        body.append("<td style=\"border:1px solid #ddd;padding:8px;\">").append(htmlValue != null ? htmlValue : "").append("</td>");
        body.append("</tr>");
    }

    private String getImplementerDisplay(String implementer) {
        if (implementer == null || implementer.trim().isEmpty()) {
            return "-";
        }
        
        // Nếu là user:ID format, tìm user thật
        if (implementer.startsWith("user:")) {
            try {
                String userId = implementer.substring(5);
                Users user = usersRepository.findById(Integer.parseInt(userId)).orElse(null);
                if (user != null && user.getFullName() != null) {
                    return user.getFullName();
                }
            } catch (Exception e) {
                // Ignore parsing errors
            }
        }
        
        // Nếu là group:ID format, tìm group thật
        if (implementer.startsWith("group:")) {
            try {
                String groupId = implementer.substring(6);
                Group group = groupRepository.findById(Long.parseLong(groupId)).orElse(null);
                if (group != null && group.getName() != null) {
                    return group.getName();
                }
            } catch (Exception e) {
                // Ignore parsing errors
            }
        }
        
        // Nếu là email, tìm user theo email
        if (implementer.contains("@")) {
            Users user = usersRepository.findByEmail(implementer).orElse(null);
            if (user != null && user.getFullName() != null) {
                return user.getFullName();
            }
        }
        
        // Fallback: trả về implementer gốc
        return implementer;
    }

    private String getAttachedFilesInfo(ChecklistDetail d) {
        if (d.getFiles() == null || d.getFiles().isEmpty()) {
            return null;
        }
        
        StringBuilder filesInfo = new StringBuilder();
        for (int i = 0; i < d.getFiles().size(); i++) {
            if (i > 0) {
                filesInfo.append("<br/>");
            }
            com.foxconn.sopchecklist.entity.ChecklistDetailFiles file = d.getFiles().get(i);
            String fileName = file.getFileName();
            String filePath = file.getFilePath();
            
            if (fileName != null && !fileName.trim().isEmpty()) {
                filesInfo.append("📎 ");
                // Tạo link download nếu có filePath
                if (filePath != null && !filePath.trim().isEmpty()) {
                    String downloadUrl = appBackendUrl + "/files" + filePath;
                    filesInfo.append("<a href=\"").append(escapeHtml(downloadUrl))
                             .append("\" style=\"color:#1677ff;text-decoration:none;\">")
                             .append(escapeHtml(fileName))
                             .append("</a>");
                } else {
                    // Không có link, chỉ hiển thị tên file
                    filesInfo.append(escapeHtml(fileName));
                }
            }
        }
        
        return filesInfo.length() > 0 ? filesInfo.toString() : null;
    }

    /**
     * Gửi mail cho người thực hiện (implementer)
     */
    private void sendMailToImplementer(String subject, String body, ChecklistDetail detail) {
        String implementerEmail = resolveImplementerEmail(detail.getImplementer());
        if (implementerEmail != null && !implementerEmail.trim().isEmpty()) {
            createMailRecord("CHECKLISTDONE_IMPLEMENTER", subject, body, implementerEmail, "", "", detail.getId());
        }
    }

    /**
     * Gửi mail cho danh sách mail trong cài đặt "Thông báo nhận mail hoàn thành checklist"
     */
    private void sendMailToChecklistCompletionRecipients(String subject, String body, ChecklistDetail detail) {
        // Lấy recipients từ mail_recipient_all với type "CHECKLISTDONE"
        String toCsv = getRecipients("CHECKLISTDONE", "TO");
        String ccCsv = getRecipients("CHECKLISTDONE", "CC");
        String bccCsv = getRecipients("CHECKLISTDONE", "BCC");
        
        if ((toCsv != null && !toCsv.trim().isEmpty()) ||
            (ccCsv != null && !ccCsv.trim().isEmpty()) ||
            (bccCsv != null && !bccCsv.trim().isEmpty())) {
            createMailRecord("CHECKLISTDONE", subject, body, toCsv, ccCsv, bccCsv, detail.getId());
        }
    }

    /**
     * Gửi mail cho danh sách mail từ biểu tượng mail trong checklist (CHECKLIST type)
     */
    private void sendMailToChecklistRecipients(String subject, String body, ChecklistDetail detail) {
        // Lấy recipients từ mail_recipient_all với type "CHECKLIST" và checklist_id cụ thể
        Long checklistId = detail.getChecklist() != null ? detail.getChecklist().getId() : null;
        if (checklistId == null) return;
        
        String toCsv = getRecipientsByChecklist(checklistId, "CHECKLIST", "TO");
        String ccCsv = getRecipientsByChecklist(checklistId, "CHECKLIST", "CC");
        String bccCsv = getRecipientsByChecklist(checklistId, "CHECKLIST", "BCC");
        
        if ((toCsv != null && !toCsv.trim().isEmpty()) ||
            (ccCsv != null && !ccCsv.trim().isEmpty()) ||
            (bccCsv != null && !bccCsv.trim().isEmpty())) {
            createMailRecord("CHECKLIST", subject, body, toCsv, ccCsv, bccCsv, detail.getId());
        }
    }

    /**
     * Tạo bản ghi mail trong cron_mail_all
     */
    private void createMailRecord(String typeName, String subject, String body, String toCsv, String ccCsv, String bccCsv, Long referenceId) {
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

            cronMailAllRepository.save(mail);
        } catch (Exception e) {
            System.err.println("Error creating mail record for type " + typeName + ": " + e.getMessage());
        }
    }

    /**
     * Lấy email của người thực hiện từ implementer string
     */
    private String resolveImplementerEmail(String implementer) {
        if (implementer == null) return null;
        String name = implementer.trim();
        if (name.isEmpty()) return null;

        String lower = name.toLowerCase();
        // Handle encoded identifiers: group:<id>, user:<id>
        try {
            if (lower.startsWith("group:")) {
                String idStr = lower.substring("group:".length()).trim();
                Long gid = Long.parseLong(idStr);
                Group grpById = groupRepository.findById(gid).orElse(null);
                if (grpById != null && grpById.getUsers() != null) {
                    return grpById.getUsers().stream()
                            .filter(this::isActiveUser)
                            .map(Users::getEmail)
                            .filter(e -> e != null && !e.trim().isEmpty())
                            .distinct()
                            .collect(Collectors.joining(","));
                }
            } else if (lower.startsWith("user:")) {
                String idStr = lower.substring("user:".length()).trim();
                Integer uid = Integer.parseInt(idStr);
                Users uById = usersRepository.findById(uid).orElse(null);
                if (uById != null && uById.getEmail() != null && !uById.getEmail().trim().isEmpty()) {
                    return uById.getEmail();
                }
            }
        } catch (Exception ignore) { }

        // 1) Nếu trùng tên group -> lấy toàn bộ email user trong group
        Group grp = groupRepository.findByNameIgnoreCase(name).orElse(null);
        if (grp != null && grp.getUsers() != null) {
            return grp.getUsers().stream()
                    .filter(this::isActiveUser)
                    .map(Users::getEmail)
                    .filter(e -> e != null && !e.trim().isEmpty())
                    .distinct()
                    .collect(Collectors.joining(","));
        }

        // 2) Nếu giống email -> gửi cho đúng user đó
        if (name.contains("@")) {
            Users uByEmail = usersRepository.findByEmail(name).orElse(null);
            if (uByEmail != null && uByEmail.getEmail() != null) return uByEmail.getEmail();
            // Không có trong bảng Users, vẫn gửi thẳng vào mailTo chuỗi này
            return name;
        }

        // 3) Thử theo mã nhân viên (manv)
        Users uByManv = usersRepository.findByManv(name).orElse(null);
        if (uByManv != null && uByManv.getEmail() != null) return uByManv.getEmail();

        // 4) Fallback: tìm theo fullName (duyệt danh sách)
        List<Users> all = usersRepository.findAll();
        String fromName = all.stream()
                .filter(this::isActiveUser)
                .filter(u -> u.getFullName() != null && u.getFullName().equalsIgnoreCase(name))
                .map(Users::getEmail)
                .filter(e -> e != null && !e.trim().isEmpty())
                .findFirst()
                .orElse(null);
        return fromName;
    }

    /**
     * Lấy recipients từ mail_recipient_all theo checklist_id
     */
    private String getRecipientsByChecklist(Long checklistId, String typeName, String recipientType) {
        try {
            List<MailRecipientAll> recipients = mailRecipientAllRepository
                .findByChecklistIdAndTypeAndTypeMailRecipientTypeNameAndEnabledTrue(checklistId, recipientType, typeName);
            return recipients.stream()
                .map(MailRecipientAll::getEmail)
                .filter(e -> e != null && !e.trim().isEmpty())
                .collect(Collectors.joining(","));
        } catch (Exception e) {
            return "";
        }
    }

    /**
     * Lấy recipients từ mail_recipient_all
     */
    private String getRecipients(String typeName, String recipientType) {
        try {
            List<MailRecipientAll> recipients = mailRecipientAllRepository
                .findByTypeAndTypeMailRecipientTypeNameAndEnabledTrue(recipientType, typeName);
            return recipients.stream()
                .map(MailRecipientAll::getEmail)
                .filter(e -> e != null && !e.trim().isEmpty())
                .collect(Collectors.joining(","));
        } catch (Exception e) {
            return "";
        }
    }

    private static String safe(String s) { return s == null ? "" : s; }
    private static String escapeHtml(String input) {
        if (input == null) return "";
        return input.replace("&", "&amp;")
                .replace("<", "&lt;")
                .replace(">", "&gt;")
                .replace("\"", "&quot;")
                .replace("'", "&#39;");
    }

    private boolean isActiveUser(Users user) {
        return user != null && (user.getStatus() == null || user.getStatus() == UserStatus.ACTIVE);
    }
}
