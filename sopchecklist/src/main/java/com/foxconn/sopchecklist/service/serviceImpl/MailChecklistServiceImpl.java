package com.foxconn.sopchecklist.service.serviceImpl;

import com.foxconn.sopchecklist.entity.CronMailAll;
import com.foxconn.sopchecklist.entity.ChecklistDetail;
import com.foxconn.sopchecklist.entity.Group;
import com.foxconn.sopchecklist.entity.TypeCronMail;
import com.foxconn.sopchecklist.entity.Users;
import com.foxconn.sopchecklist.repository.CronMailAllRepository;
import com.foxconn.sopchecklist.repository.GroupRepository;
import com.foxconn.sopchecklist.repository.TypeCronMailRepository;
import com.foxconn.sopchecklist.repository.UsersRepository;
import com.foxconn.sopchecklist.service.MailChecklistService;
import com.foxconn.sopchecklist.service.TimeService;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.stream.Collectors;

@Service
public class MailChecklistServiceImpl implements MailChecklistService {

    private final CronMailAllRepository mailRepository;
    private final GroupRepository groupRepository;
    private final UsersRepository usersRepository;
    private final TypeCronMailRepository typeCronMailRepository;
    private final TimeService timeService;

    @Value("${app.public.url:http://10.228.64.77:3000}")
    private String appPublicUrl;

    public MailChecklistServiceImpl(CronMailAllRepository mailRepository,
                                    GroupRepository groupRepository,
                                    UsersRepository usersRepository,
                                    TypeCronMailRepository typeCronMailRepository,
                                    TimeService timeService) {
        this.mailRepository = mailRepository;
        this.groupRepository = groupRepository;
        this.usersRepository = usersRepository;
        this.typeCronMailRepository = typeCronMailRepository;
        this.timeService = timeService;
    }

    @Override
    public CronMailAll queueChecklistDetailMail(ChecklistDetail detail) {
        if (detail == null) return null;
        
        // Tìm type cho checklist mail
        TypeCronMail checklistType = typeCronMailRepository.findByTypeName("CHECKLIST");
        if (checklistType == null) {
            // Nếu chưa có type CHECKLIST, tạo mới
            checklistType = new TypeCronMail();
            checklistType.setTypeName("CHECKLIST");
            checklistType.setDescription("Mail thông báo checklist");
            checklistType.setEnabled(true);
            checklistType.setCreatedAt(timeService.nowVietnam());
            checklistType.setUpdatedAt(timeService.nowVietnam());
            checklistType = typeCronMailRepository.save(checklistType);
        }
        
        String toCsv = resolveRecipients(detail.getImplementer());
        if (toCsv == null || toCsv.trim().isEmpty()) {
            // Không có người nhận, vẫn ghi hàng đợi để thấy lỗi
            toCsv = "";
        }

        String subject = buildSubject(detail);
        String body = buildBody(detail);

        CronMailAll mail = new CronMailAll();
        mail.setTypeId(checklistType.getId());
        mail.setMailTo(toCsv);
        mail.setMailCC("");
        mail.setMailBCC("");
        mail.setSubject(subject);
        mail.setBody(body);
        mail.setStatus("PENDING");
        mail.setRetryCount(0);
        mail.setLastError(null);
        mail.setReferenceId(detail.getId()); // Sử dụng referenceId thay vì checklistDetailId
        mail.setCreatedAt(timeService.nowVietnam());
        return mailRepository.save(mail);
    }

    @Override
    public CronMailAll queueChecklistReminderMail(ChecklistDetail detail) {
        if (detail == null) return null;

        // Lấy/khởi tạo type CHECKLIST (dùng chung với mail từ biểu tượng chuông)
        TypeCronMail checklistType = typeCronMailRepository.findByTypeName("CHECKLIST");
        if (checklistType == null) {
            checklistType = new TypeCronMail();
            checklistType.setTypeName("CHECKLIST");
            checklistType.setDescription("Mail thông báo checklist");
            checklistType.setEnabled(true);
            checklistType.setCreatedAt(timeService.nowVietnam());
            checklistType.setUpdatedAt(timeService.nowVietnam());
            checklistType = typeCronMailRepository.save(checklistType);
        }

        String toCsv = resolveRecipients(detail.getImplementer());
        if (toCsv == null) toCsv = "";

        String subject = buildReminderSubject(detail);
        String body = buildReminderBody(detail);

        CronMailAll mail = new CronMailAll();
        mail.setTypeId(checklistType.getId());
        mail.setMailTo(toCsv);
        mail.setMailCC("");
        mail.setMailBCC("");
        mail.setSubject(subject);
        mail.setBody(body);
        mail.setStatus("PENDING");
        mail.setRetryCount(0);
        mail.setLastError(null);
        mail.setReferenceId(detail.getId());
        mail.setCreatedAt(timeService.nowVietnam());
        return mailRepository.save(mail);
    }

    private String buildReminderSubject(ChecklistDetail d) {
        String task = d.getTaskName() != null ? d.getTaskName() : "Checklist";
        return "Công việc cần phải hoàn thành gấp: " + task;
    }

    private String buildReminderBody(ChecklistDetail d) {
        DateTimeFormatter fmt = DateTimeFormatter.ofPattern("dd/MM/yyyy HH:mm");
        String task = safe(d.getTaskName());
        String content = safe(d.getWorkContent());
        String implementer = getImplementerDisplay(d.getImplementer());
        String created = d.getCreatedAt() != null ? d.getCreatedAt().format(fmt) : "";
        String deadline = d.getDeadlineAt() != null ? d.getDeadlineAt().format(fmt) : "";

        StringBuilder body = new StringBuilder();
        body.append("<div style=\"font-family:Arial,Helvetica,sans-serif;color:#333;line-height:1.6;\">");
        body.append("<h2 style=\"margin:0 0 12px;color:#d4380d;\">Công việc cần hoàn thành gấp</h2>");
        body.append("<table style=\"border-collapse:collapse;width:100%;\">");
        row(body, "Tên công việc", task);
        row(body, "Nội dung công việc", content);
        row(body, "Người thực hiện", implementer);
        row(body, "Ngày tạo", created);
        row(body, "Hạn hoàn thành", deadline);
        row(body, "Trạng thái", getStatusDisplay(d.getStatus()));
        body.append("</table>");
        try {
            String appBase = appPublicUrl;
            Long detailId = d.getId();
            if (detailId != null) {
                String link = appBase + "/checklist-detail/" + detailId;
                body.append("<p style=\"margin-top:12px;\"><a href=\"")
                        .append(link)
                        .append("\" style=\"display:inline-block;background:#d4380d;color:#fff;padding:8px 12px;border-radius:4px;text-decoration:none;\">Mở chi tiết checklist</a></p>");
            }
        } catch (Exception ignore) {}
        body.append("<p><strong>Vui lòng hoàn thành sớm nhất có thể.</strong></p>");
        body.append("</div>");
        return body.toString();
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
        String implementer = getImplementerDisplay(d.getImplementer());
        String created = d.getCreatedAt() != null ? d.getCreatedAt().format(fmt) : "";
        String deadline = d.getDeadlineAt() != null ? d.getDeadlineAt().format(fmt) : "";

        StringBuilder body = new StringBuilder();
        body.append("<div style=\"font-family:Arial,Helvetica,sans-serif;color:#333;line-height:1.6;\">");
        body.append("<h2 style=\"margin:0 0 12px;\">Công việc mới được tạo</h2>");
        body.append("<table style=\"border-collapse:collapse;width:100%;\">");
        row(body, "Tên công việc", task);
        row(body, "Nội dung công việc", content);
        row(body, "Người thực hiện", implementer);
        row(body, "Ngày tạo", created);
        row(body, "Hạn hoàn thành", deadline);
        row(body, "Trạng thái", getStatusDisplay(d.getStatus()));
        
        body.append("</table>");

        // Deep link tới trang checklist detail cụ thể
        try {
            // Use configured URL from application.properties
            String appBase = appPublicUrl;
            Long detailId = d.getId();
            if (detailId != null) {
                String link = appBase + "/checklist-detail/" + detailId;
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
    
    private String getStatusDisplay(String status) {
        if (status == null) return "Chưa xác định";
        
        switch (status.toUpperCase()) {
            case "IN_PROGRESS":
            case "PENDING":
                return "Đang xử lý";
            case "COMPLETED":
            case "DONE":
                return "Hoàn thành";
            case "CANCELLED":
                return "Đã hủy";
            default:
                return "Chưa xác định";
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
}