package com.foxconn.sopchecklist.service.serviceImpl;

import com.foxconn.sopchecklist.entity.ChecklistDetail;
import com.foxconn.sopchecklist.entity.CronMailAll;
import com.foxconn.sopchecklist.entity.Group;
import com.foxconn.sopchecklist.entity.Improvements;
import com.foxconn.sopchecklist.entity.MailRecipientAll;
import com.foxconn.sopchecklist.entity.TypeCronMail;
import com.foxconn.sopchecklist.entity.Users;
import com.foxconn.sopchecklist.repository.CronMailAllRepository;
import com.foxconn.sopchecklist.repository.GroupRepository;
import com.foxconn.sopchecklist.repository.MailRecipientAllRepository;
import com.foxconn.sopchecklist.repository.TypeCronMailRepository;
import com.foxconn.sopchecklist.repository.UsersRepository;
import com.foxconn.sopchecklist.service.MailImprovementCreationService;
import com.foxconn.sopchecklist.service.TimeService;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.stream.Collectors;

@Service
public class MailImprovementCreationServiceImpl implements MailImprovementCreationService {

    private final GroupRepository groupRepository;
    private final UsersRepository usersRepository;
    private final CronMailAllRepository cronMailAllRepository;
    private final MailRecipientAllRepository mailRecipientAllRepository;
    private final TypeCronMailRepository typeCronMailRepository;
    private final TimeService timeService;

    @Value("${app.public.url:http://10.228.64.77:3000}")
    private String appPublicUrl;

    public MailImprovementCreationServiceImpl(GroupRepository groupRepository,
                                              UsersRepository usersRepository,
                                              CronMailAllRepository cronMailAllRepository,
                                              MailRecipientAllRepository mailRecipientAllRepository,
                                              TypeCronMailRepository typeCronMailRepository,
                                              TimeService timeService) {
        this.groupRepository = groupRepository;
        this.usersRepository = usersRepository;
        this.cronMailAllRepository = cronMailAllRepository;
        this.mailRecipientAllRepository = mailRecipientAllRepository;
        this.typeCronMailRepository = typeCronMailRepository;
        this.timeService = timeService;
    }

    @Override
    public void queueImprovementCreatedMail(ChecklistDetail detail, Improvements improvement) {
        if (detail == null || improvement == null) return;

        String subject = buildSubject(detail);
        String body = buildBody(detail, improvement);

        // 1) Recipients from system settings "Thông báo mail cải thiện"
        sendToImprovementSettings(subject, body, improvement);

        // 2) Implementer (user or group) from checklist detail implementer/responsible
        sendToImplementer(subject, body, detail);

        // 3) Per-checklist recipients from checklist mail list
        sendToChecklistMailList(subject, body, detail);
    }

    @Override
    public void queueDirectImprovementCreationMail(Improvements improvement) {
        if (improvement == null) return;

        String subject = buildDirectImprovementSubject(improvement);
        String body = buildDirectImprovementBody(improvement);

        // 1) Recipients from system settings "Thông báo mail cải thiện"
        sendToImprovementSettings(subject, body, improvement);

        // 2) Send to responsible persons and collaborators
        sendToResponsibleAndCollaborators(subject, body, improvement);
    }

    private String buildDirectImprovementSubject(Improvements i) {
        String category = i.getCategory() != null ? i.getCategory() : "Cải thiện";
        return "Thông báo cải thiện mới: " + category;
    }

    private String buildDirectImprovementBody(Improvements i) {
        DateTimeFormatter dateFmt = DateTimeFormatter.ofPattern("dd/MM/yyyy");
        DateTimeFormatter dateTimeFmt = DateTimeFormatter.ofPattern("dd/MM/yyyy HH:mm");
        
        String category = safe(i.getCategory());
        String issueDescription = safe(i.getIssueDescription());
        String responsible = getResponsibleDisplay(i.getResponsible());
        String collaborators = getResponsibleDisplay(i.getCollaborators());
        String improvementEvent = i.getImprovementEvent() != null ? safe(i.getImprovementEvent().getEventName()) : "";
        String actionPlan = safe(i.getActionPlan());
        String plannedDue = i.getPlannedDueAt() != null ? i.getPlannedDueAt().format(dateTimeFmt) : "";
        String created = i.getCreatedAt() != null ? i.getCreatedAt().format(dateTimeFmt) : "";

        StringBuilder body = new StringBuilder();
        body.append("<div style=\"font-family:Arial,Helvetica,sans-serif;color:#333;line-height:1.6;\">");
        body.append("<h2 style=\"margin:0 0 12px;color:#0d6efd;\">📋 Thông báo cải thiện mới</h2>");
        body.append("<table style=\"border-collapse:collapse;width:100%;\">" );
        row(body, "Hạng mục", category);
        row(body, "Nội dung cải thiện", issueDescription);
        row(body, "Người phụ trách", responsible);
        if (!collaborators.isEmpty()) {
            row(body, "Người phối hợp", collaborators);
        }
        if (!improvementEvent.isEmpty()) {
            row(body, "Loại sự kiện", improvementEvent);
        }
        if (!actionPlan.isEmpty()) {
            row(body, "Hành động cải thiện", actionPlan);
        }
        if (!plannedDue.isEmpty()) {
            row(body, "Thời gian dự kiến hoàn thành", plannedDue);
        }
        row(body, "Thời gian tạo", created);
        body.append("</table>");

        try {
            Integer improvementId = i.getImprovementID();
            if (improvementId != null) {
                String link = appPublicUrl + "/improvement?improvementId=" + improvementId;
                body.append("<p style=\"margin-top:12px;\"><a href=\"");
                body.append(link);
                body.append("\" style=\"display:inline-block;background:#0d6efd;color:#fff;padding:8px 12px;border-radius:4px;text-decoration:none;\">Xem chi tiết cải thiện</a></p>");
            }
        } catch (Exception ignore) {}

        body.append("<p><strong>Trân trọng,</strong></p>");
        body.append("<p><em>Hệ thống IT Management</em></p>");
        body.append("</div>");
        return body.toString();
    }

    private void sendToResponsibleAndCollaborators(String subject, String body, Improvements improvement) {
        // Lấy danh sách email người phụ trách
        StringBuilder emailCsv = new StringBuilder();
        List<String> responsibleList = improvement.getResponsible();
        if (responsibleList != null && !responsibleList.isEmpty()) {
            for (String responsible : responsibleList) {
                String email = resolveResponsibleEmail(responsible);
                if (email != null && !email.trim().isEmpty()) {
                    if (emailCsv.length() > 0) emailCsv.append(",");
                    emailCsv.append(email);
                }
            }
        }
        
        // Lấy danh sách email người phối hợp
        StringBuilder ccCsv = new StringBuilder();
        List<String> collaboratorsList = improvement.getCollaborators();
        if (collaboratorsList != null && !collaboratorsList.isEmpty()) {
            for (String collaborator : collaboratorsList) {
                String email = resolveResponsibleEmail(collaborator);
                if (email != null && !email.trim().isEmpty()) {
                    if (ccCsv.length() > 0) ccCsv.append(",");
                    ccCsv.append(email);
                }
            }
        }
        
        String emailCsvStr = emailCsv.toString();
        String ccCsvStr = ccCsv.toString();
        
        // Chỉ tạo mail record nếu có ít nhất người phụ trách hoặc người phối hợp
        if ((emailCsvStr != null && !emailCsvStr.trim().isEmpty()) || 
            (ccCsvStr != null && !ccCsvStr.trim().isEmpty())) {
            Long referenceId = improvement.getImprovementID() != null ? improvement.getImprovementID().longValue() : null;
            createMailRecord("IMPROVEMENT_CREATION", subject, body, emailCsvStr, ccCsvStr, "", referenceId);
        }
    }

    private String getResponsibleDisplay(List<String> responsibleList) {
        if (responsibleList == null || responsibleList.isEmpty()) return "";
        return responsibleList.stream()
                .map(this::getImplementerDisplay)
                .collect(Collectors.joining(", "));
    }

    private String resolveResponsibleEmail(String responsible) {
        if (responsible == null) return null;
        String name = responsible.trim();
        if (name.isEmpty()) return null;
        String lower = name.toLowerCase();
        try {
            if (lower.startsWith("group:")) {
                Long gid = Long.parseLong(lower.substring("group:".length()).trim());
                Group grp = groupRepository.findById(gid).orElse(null);
                if (grp != null && grp.getUsers() != null) {
                    return grp.getUsers().stream()
                            .map(Users::getEmail)
                            .filter(e -> e != null && !e.trim().isEmpty())
                            .distinct()
                            .collect(Collectors.joining(","));
                }
            } else if (lower.startsWith("user:")) {
                Integer uid = Integer.parseInt(lower.substring("user:".length()).trim());
                Users u = usersRepository.findById(uid).orElse(null);
                if (u != null && u.getEmail() != null && !u.getEmail().trim().isEmpty()) return u.getEmail();
            }
        } catch (Exception ignore) {}

        Group grpByName = groupRepository.findByNameIgnoreCase(name).orElse(null);
        if (grpByName != null && grpByName.getUsers() != null) {
            return grpByName.getUsers().stream()
                    .map(Users::getEmail)
                    .filter(e -> e != null && !e.trim().isEmpty())
                    .distinct()
                    .collect(Collectors.joining(","));
        }

        if (name.contains("@")) {
            Users uByEmail = usersRepository.findByEmail(name).orElse(null);
            if (uByEmail != null && uByEmail.getEmail() != null) return uByEmail.getEmail();
            return name;
        }

        Users uByManv = usersRepository.findByManv(name).orElse(null);
        if (uByManv != null && uByManv.getEmail() != null) return uByManv.getEmail();

        List<Users> all = usersRepository.findAll();
        String fromName = all.stream()
                .filter(u -> u.getFullName() != null && u.getFullName().equalsIgnoreCase(name))
                .map(Users::getEmail)
                .filter(e -> e != null && !e.trim().isEmpty())
                .findFirst()
                .orElse(null);
        return fromName;
    }

    private String buildSubject(ChecklistDetail d) {
        String task = d.getTaskName() != null ? d.getTaskName() : "Checklist";
        return "Thông báo phát sinh cải thiện: " + task;
    }

    private String buildBody(ChecklistDetail d, Improvements i) {
        DateTimeFormatter fmt = DateTimeFormatter.ofPattern("dd/MM/yyyy HH:mm");
        String task = safe(d.getTaskName());
        String content = safe(d.getWorkContent());
        String implementer = getImplementerDisplay(d.getImplementer());
        String abnormalInfo = safe(d.getAbnormalInfo());
        String created = i.getCreatedAt() != null ? i.getCreatedAt().format(fmt) : "";

        StringBuilder body = new StringBuilder();
        body.append("<div style=\"font-family:Arial,Helvetica,sans-serif;color:#333;line-height:1.6;\">");
        body.append("<h2 style=\"margin:0 0 12px;color:#d9534f;\">⚠️ Phát sinh cải thiện từ Checklist</h2>");
        body.append("<table style=\"border-collapse:collapse;width:100%;\">");
        row(body, "Tên công việc", task);
        row(body, "Nội dung công việc", content);
        row(body, "Người phụ trách", implementer);
        row(body, "Thời gian ghi nhận", created);
        row(body, "Thông tin bất thường", abnormalInfo);
        body.append("</table>");

        try {
            Long detailId = d.getId();
            if (detailId != null) {
                String link = appPublicUrl + "/improvement?detailId=" + detailId;
                body.append("<p style=\"margin-top:12px;\"><a href=\"")
                        .append(link)
                        .append("\" style=\"display:inline-block;background:#0d6efd;color:#fff;padding:8px 12px;border-radius:4px;text-decoration:none;\">Xem cải thiện</a></p>");
            }
        } catch (Exception ignore) {}

        body.append("<p><strong>Trân trọng,</strong></p>");
        body.append("<p><em>Hệ thống IT Management</em></p>");
        body.append("</div>");
        return body.toString();
    }

    private void sendToImprovementSettings(String subject, String body, Improvements improvement) {
        String toCsv = getRecipients("IMPROVEMENTDONE", "TO");
        String ccCsv = getRecipients("IMPROVEMENTDONE", "CC");
        String bccCsv = getRecipients("IMPROVEMENTDONE", "BCC");
        if (hasAny(toCsv, ccCsv, bccCsv)) {
            createMailRecord("IMPROVEMENTDONE", subject, body, toCsv, ccCsv, bccCsv, safeReferenceId(improvement));
        }
    }

    private void sendToImplementer(String subject, String body, ChecklistDetail detail) {
        String implementerCsv = resolveResponsibleEmail(detail.getImplementer());
        if (implementerCsv != null && !implementerCsv.trim().isEmpty()) {
            createMailRecord("IMPROVEMENT_IMPLEMENTER", subject, body, implementerCsv, "", "", detail.getId());
        }
    }

    private void sendToChecklistMailList(String subject, String body, ChecklistDetail detail) {
        Long checklistId = detail.getChecklist() != null ? detail.getChecklist().getId() : null;
        if (checklistId == null) return;
        String toCsv = getRecipientsByChecklist(checklistId, "CHECKLIST", "TO");
        String ccCsv = getRecipientsByChecklist(checklistId, "CHECKLIST", "CC");
        String bccCsv = getRecipientsByChecklist(checklistId, "CHECKLIST", "BCC");
        if (hasAny(toCsv, ccCsv, bccCsv)) {
            createMailRecord("CHECKLIST", subject, body, toCsv, ccCsv, bccCsv, detail.getId());
        }
    }

    private boolean hasAny(String a, String b, String c) {
        return (a != null && !a.trim().isEmpty()) || (b != null && !b.trim().isEmpty()) || (c != null && !c.trim().isEmpty());
    }

    private Long safeReferenceId(Improvements i) {
        return i.getImprovementID() != null ? i.getImprovementID().longValue() : null;
    }

    private void createMailRecord(String typeName, String subject, String body, String toCsv, String ccCsv, String bccCsv, Long referenceId) {
        try {
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
        } catch (Exception ignored) {}
    }

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

    private String getImplementerDisplay(String implementer) {
        if (implementer == null || implementer.trim().isEmpty()) return "-";
        if (implementer.startsWith("user:")) {
            try {
                Integer uid = Integer.parseInt(implementer.substring(5));
                Users u = usersRepository.findById(uid).orElse(null);
                if (u != null && u.getFullName() != null) return u.getFullName();
            } catch (Exception ignore) {}
        }
        if (implementer.startsWith("group:")) {
            try {
                Long gid = Long.parseLong(implementer.substring(6));
                Group g = groupRepository.findById(gid).orElse(null);
                if (g != null && g.getName() != null) return g.getName();
            } catch (Exception ignore) {}
        }
        Users byEmail = implementer.contains("@") ? usersRepository.findByEmail(implementer).orElse(null) : null;
        if (byEmail != null && byEmail.getFullName() != null) return byEmail.getFullName();
        return implementer;
    }

    private static void row(StringBuilder body, String name, String value) {
        body.append("<tr>");
        body.append("<td style=\"border:1px solid #ddd;padding:8px;background:#f5f5f5;\">").append(escapeHtml(name)).append("</td>");
        body.append("<td style=\"border:1px solid #ddd;padding:8px;\">").append(escapeHtml(value)).append("</td>");
        body.append("</tr>");
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
}


