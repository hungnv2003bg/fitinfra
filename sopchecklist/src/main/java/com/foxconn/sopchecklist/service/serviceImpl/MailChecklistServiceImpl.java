package com.foxconn.sopchecklist.service.serviceImpl;

import com.foxconn.sopchecklist.entity.ChecklistCronMail;
import com.foxconn.sopchecklist.entity.ChecklistDetail;
import com.foxconn.sopchecklist.entity.Group;
import com.foxconn.sopchecklist.entity.Users;
import com.foxconn.sopchecklist.repository.ChecklistMailRepository;
import com.foxconn.sopchecklist.repository.GroupRepository;
import com.foxconn.sopchecklist.repository.UsersRepository;
import com.foxconn.sopchecklist.service.MailChecklistService;
import com.foxconn.sopchecklist.service.TimeService;
import org.springframework.stereotype.Service;

import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;

@Service
public class MailChecklistServiceImpl implements MailChecklistService {

    private final ChecklistMailRepository mailRepository;
    private final GroupRepository groupRepository;
    private final UsersRepository usersRepository;
    private final TimeService timeService;

    public MailChecklistServiceImpl(ChecklistMailRepository mailRepository,
                                    GroupRepository groupRepository,
                                    UsersRepository usersRepository,
                                    TimeService timeService) {
        this.mailRepository = mailRepository;
        this.groupRepository = groupRepository;
        this.usersRepository = usersRepository;
        this.timeService = timeService;
    }

    @Override
    public ChecklistCronMail queueChecklistDetailMail(ChecklistDetail detail) {
        if (detail == null) return null;
        String toCsv = resolveRecipients(detail.getImplementer());
        if (toCsv == null || toCsv.trim().isEmpty()) {
            // Không có người nhận, vẫn ghi hàng đợi để thấy lỗi
            toCsv = "";
        }

        String subject = buildSubject(detail);
        String body = buildBody(detail);

        ChecklistCronMail mail = new ChecklistCronMail();
        mail.setMailTo(toCsv);
        mail.setMailCC("");
        mail.setMailBCC("");
        mail.setSubject(subject);
        mail.setBody(body);
        mail.setStatus("pending");
        mail.setRetryCount(0);
        mail.setLastError(null);
        mail.setChecklistDetailId(detail.getId());
        mail.setCreatedAt(timeService.nowVietnam());
        return mailRepository.save(mail);
    }

    private String resolveRecipients(String implementer) {
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
                .filter(u -> u.getFullName() != null && u.getFullName().equalsIgnoreCase(name))
                .map(Users::getEmail)
                .filter(e -> e != null && !e.trim().isEmpty())
                .findFirst()
                .orElse(null);
        return fromName;
    }

    private String buildSubject(ChecklistDetail d) {
        String task = d.getTaskName() != null ? d.getTaskName() : "Checklist";
        return "Thông báo checklist mới: " + task;
    }

    private String buildBody(ChecklistDetail d) {
        DateTimeFormatter fmt = DateTimeFormatter.ofPattern("dd/MM/yyyy HH:mm");
        String task = safe(d.getTaskName());
        String content = safe(d.getWorkContent());
        String implementer = safe(d.getImplementer());
        String scheduled = d.getScheduledAt() != null ? d.getScheduledAt().format(fmt) : "";
        String created = d.getCreatedAt() != null ? d.getCreatedAt().format(fmt) : "";
        String deadline = d.getDeadlineAt() != null ? d.getDeadlineAt().format(fmt) : "";

        StringBuilder body = new StringBuilder();
        body.append("<div style=\"font-family:Arial,Helvetica,sans-serif;color:#333;line-height:1.6;\">");
        body.append("<h2 style=\"margin:0 0 12px;\">Checklist mới được tạo</h2>");
        body.append("<table style=\"border-collapse:collapse;width:100%;\">");
        row(body, "Tên công việc", task);
        row(body, "Nội dung công việc", content);
        row(body, "Người thực hiện", implementer);
        row(body, "Ngày tạo", created);
        row(body, "Lịch thực hiện", scheduled);
        row(body, "Hạn hoàn thành", deadline);
        body.append("</table>");

        // Deep link tới trang checklist detail
        try {
            String appBase = System.getenv("APP_PUBLIC_URL");
            if (appBase == null || appBase.trim().isEmpty()) {
                appBase = "http://" + java.net.InetAddress.getLocalHost().getHostAddress() + ":3000";
            }
            Long checklistId = d.getChecklist() != null ? d.getChecklist().getId() : null;
            if (checklistId != null) {
                String link = appBase + "/checklist/" + checklistId + "/details";
                body.append("<p style=\"margin-top:12px;\"><a href=\"")
                        .append(link)
                        .append("\" style=\"display:inline-block;background:#1677ff;color:#fff;padding:8px 12px;border-radius:4px;text-decoration:none;\">Mở chi tiết checklist</a></p>");
            }
        } catch (Exception ignore) {}

        body.append("<p><strong>Trân trọng,</strong></p>");
        body.append("</div>");
        return body.toString();
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