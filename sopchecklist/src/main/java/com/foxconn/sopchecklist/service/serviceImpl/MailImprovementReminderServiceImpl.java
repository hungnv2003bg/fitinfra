package com.foxconn.sopchecklist.service.serviceImpl;

import com.foxconn.sopchecklist.entity.CronMailAll;
import com.foxconn.sopchecklist.entity.Group;
import com.foxconn.sopchecklist.entity.Improvements;
import com.foxconn.sopchecklist.entity.TypeCronMail;
import com.foxconn.sopchecklist.entity.Users;
import com.foxconn.sopchecklist.repository.CronMailAllRepository;
import com.foxconn.sopchecklist.repository.GroupRepository;
import com.foxconn.sopchecklist.repository.TypeCronMailRepository;
import com.foxconn.sopchecklist.repository.UsersRepository;
import com.foxconn.sopchecklist.service.MailImprovementReminderService;
import com.foxconn.sopchecklist.service.TimeService;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.stream.Collectors;

@Service
public class MailImprovementReminderServiceImpl implements MailImprovementReminderService {

    private final GroupRepository groupRepository;
    private final UsersRepository usersRepository;
    private final CronMailAllRepository cronMailAllRepository;
    private final TypeCronMailRepository typeCronMailRepository;
    private final TimeService timeService;

    @Value("${app.public.url:http://10.228.64.77:3000}")
    private String appPublicUrl;

    public MailImprovementReminderServiceImpl(GroupRepository groupRepository,
                                             UsersRepository usersRepository,
                                             CronMailAllRepository cronMailAllRepository,
                                             TypeCronMailRepository typeCronMailRepository,
                                             TimeService timeService) {
        this.groupRepository = groupRepository;
        this.usersRepository = usersRepository;
        this.cronMailAllRepository = cronMailAllRepository;
        this.typeCronMailRepository = typeCronMailRepository;
        this.timeService = timeService;
    }

    @Override
    public void queueImprovementReminderMail(Improvements improvement) {
        if (improvement == null) return;

        String subject = buildSubject(improvement);
        String body = buildBody(improvement);

        // Gửi cho người phụ trách (responsible) và người phối hợp (collaborators)
        sendToResponsibleAndCollaborators(subject, body, improvement);
    }

    private String buildSubject(Improvements i) {
        String category = i.getCategory() != null ? i.getCategory() : "Cải thiện";
        return "Gấp bạn cần hoàn thành cải thiện: " + category;
    }

    private String buildBody(Improvements i) {
        DateTimeFormatter dateFmt = DateTimeFormatter.ofPattern("dd/MM/yyyy");
        
        String category = safe(i.getCategory());
        String issueDescription = safe(i.getIssueDescription());
        String responsible = getResponsibleDisplay(i.getResponsible());
        String collaborators = getResponsibleDisplay(i.getCollaborators());
        String plannedDueAt = i.getPlannedDueAt() != null ? i.getPlannedDueAt().format(dateFmt) : "";
        String status = getStatusDisplay(i.getStatus());
        String progress = i.getProgress() != null ? i.getProgress() + "%" : "";

        StringBuilder body = new StringBuilder();
        body.append("<div style=\"font-family:Arial,Helvetica,sans-serif;color:#333;line-height:1.6;\">");
        body.append("<h2 style=\"margin:0 0 12px;color:#d9534f;\">⚠️ Nhắc nhở hoàn thành cải thiện</h2>");
        body.append("<p style=\"color:#d9534f;font-weight:bold;margin-bottom:12px;\">Cải thiện này đã đến thời gian dự kiến hoàn thành nhưng chưa được hoàn thành.</p>");
        body.append("<table style=\"border-collapse:collapse;width:100%;\">");
        row(body, "Hạng mục", category);
        if (issueDescription != null && !issueDescription.trim().isEmpty()) {
            row(body, "Nội dung cải thiện", issueDescription);
        }
        if (responsible != null && !responsible.trim().isEmpty() && !responsible.equals("-")) {
            row(body, "Người phụ trách", responsible);
        }
        if (collaborators != null && !collaborators.trim().isEmpty() && !collaborators.equals("-")) {
            row(body, "Người phối hợp", collaborators);
        }
        if (plannedDueAt != null && !plannedDueAt.trim().isEmpty()) {
            row(body, "Dự kiến hoàn thành", plannedDueAt);
        }
        if (status != null && !status.trim().isEmpty()) {
            row(body, "Trạng thái", status);
        }
        if (progress != null && !progress.trim().isEmpty()) {
            row(body, "Tiến độ", progress);
        }
        body.append("</table>");

        try {
            Integer improvementId = i.getImprovementID();
            if (improvementId != null) {
                String link = appPublicUrl + "/improvement?improvementId=" + improvementId;
                body.append("<p style=\"margin-top:12px;\"><a href=\"")
                        .append(link)
                        .append("\" style=\"display:inline-block;background:#d9534f;color:#fff;padding:8px 12px;border-radius:4px;text-decoration:none;\">Xem Improvement</a></p>");
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
            createMailRecord("IMPROVEMENT_REMINDER", subject, body, emailCsvStr, ccCsvStr, "", referenceId);
        }
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

    private String getStatusDisplay(String status) {
        if (status == null || status.trim().isEmpty()) return "";
        String statusUpper = status.toUpperCase();
        if (statusUpper.equals("DONE") || statusUpper.equals("COMPLETED") || statusUpper.contains("HOÀN")) {
            return "Hoàn thành";
        } else if (statusUpper.equals("IN_PROGRESS") || statusUpper.contains("ĐANG")) {
            return "Đang thực hiện";
        } else if (statusUpper.equals("PENDING") || statusUpper.contains("CHƯA")) {
            return "Chưa thực hiện";
        }
        return status;
    }

    private String getResponsibleDisplay(List<String> responsibleList) {
        if (responsibleList == null || responsibleList.isEmpty()) return "-";
        List<String> displayNames = responsibleList.stream()
            .map(resp -> {
                if (resp == null || resp.trim().isEmpty()) return null;
                if (resp.startsWith("user:")) {
                    try {
                        Integer uid = Integer.parseInt(resp.substring(5));
                        Users u = usersRepository.findById(uid).orElse(null);
                        if (u != null && u.getFullName() != null) return u.getFullName();
                    } catch (Exception ignore) {}
                }
                if (resp.startsWith("group:")) {
                    try {
                        Long gid = Long.parseLong(resp.substring(6));
                        Group g = groupRepository.findById(gid).orElse(null);
                        if (g != null && g.getName() != null) return g.getName();
                    } catch (Exception ignore) {}
                }
                Users byEmail = resp.contains("@") ? usersRepository.findByEmail(resp).orElse(null) : null;
                if (byEmail != null && byEmail.getFullName() != null) return byEmail.getFullName();
                return resp;
            })
            .filter(name -> name != null)
            .collect(Collectors.toList());
        return displayNames.isEmpty() ? "-" : String.join(", ", displayNames);
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

