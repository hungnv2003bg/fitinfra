package com.foxconn.sopchecklist.controller;

import com.foxconn.sopchecklist.entity.SOPDocuments;
import com.foxconn.sopchecklist.entity.Users;
import com.foxconn.sopchecklist.exception.NotFoundException;
import com.foxconn.sopchecklist.service.SOPDocumentsService;
import com.foxconn.sopchecklist.service.UsersService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.servlet.mvc.support.RedirectAttributes;
import org.springframework.http.ResponseEntity;
import java.net.URI;
import java.util.List;
import java.util.Map;
import java.util.HashMap;
import java.util.ArrayList;

@Controller
@RequestMapping("/admin/")
public class SOPDocumentsController {

    @Autowired
    private SOPDocumentsService sopDocumentsService;

    @Value("${app.public.url:http://10.228.64.77:3000}")
    private String appPublicUrl;

    @GetMapping("/sop-all")
    public String getAllSOP(Model model) {
        List<SOPDocuments> sopList = sopDocumentsService.findAll();
        model.addAttribute("items", sopList);
        return "admin/sop-list";
    }


    @GetMapping("/sop-create")
    public String viewAddSOP(Model model) {
        SOPDocuments sop = new SOPDocuments();
        model.addAttribute("action", "/admin/sop-save");
        model.addAttribute("SOPDocuments", sop);
        return "admin/sop-create";
    }

    @PostMapping("/sop-save")
    public String addSOP(@Validated @ModelAttribute("SOPDocuments") SOPDocuments sop,
                         RedirectAttributes redirectAttributes) {
        try {
            sopDocumentsService.save(sop);
            redirectAttributes.addFlashAttribute("successMessage", "Thêm SOP mới thành công");
        } catch (Exception e) {
            redirectAttributes.addFlashAttribute("errorMessage", e.getMessage());
            return "redirect:/admin/sop-create";
        }
        return "redirect:/admin/sop-all";
    }

    @PostMapping("/sop-update/{id}")
    public String updateSOP(@PathVariable("id") Integer id,
                            @Validated @ModelAttribute("SOPDocuments") SOPDocuments sop,
                            RedirectAttributes redirectAttributes) {
        try {
            sopDocumentsService.update(sop);
            redirectAttributes.addFlashAttribute("successMessage", "Cập nhật SOP thành công");
        } catch (NotFoundException e) {
            return "404";
        } catch (Exception e) {
            redirectAttributes.addFlashAttribute("errorMessage", e.getMessage());
            return "redirect:/admin/sop-detail/" + id;
        }
        return "redirect:/admin/sop-all";
    }

    @GetMapping("/sop-detail/{id}")
    public String detailSOP(@PathVariable("id") Integer id, Model model) {
        SOPDocuments sop = sopDocumentsService.findById(id);
        if (sop != null) {
            model.addAttribute("SOPDocuments", sop);
            model.addAttribute("action", "/admin/sop-update/" + sop.getDocumentID());
            return "admin/sop-create";
        } else {
            return "404";
        }
    }


    @GetMapping("/sop-delete/{id}")
    public String deleteSOP(@PathVariable("id") Integer id) {
        sopDocumentsService.delete(id);
        return "redirect:/admin/sop-all";
    }


    
    @RestController
    @RequestMapping("/api/sop-documents")
    @CrossOrigin
    public static class SOPDocumentsRestController {
        
        @Autowired
        private SOPDocumentsService sopDocumentsService;
        
        @Autowired
        private UsersService usersService;

        @Autowired
        private com.foxconn.sopchecklist.service.TimeService timeService;

        @Autowired
        private com.foxconn.sopchecklist.service.CronMailAllSendService cronMailAllSendService;

        @Autowired
        private com.foxconn.sopchecklist.repository.GroupRepository groupRepository;

        @org.springframework.beans.factory.annotation.Value("${sop.edit-delete.limit-days:3}")
        private int editDeleteLimitDays;

        @org.springframework.beans.factory.annotation.Value("${app.public.url:http://10.228.64.77:3000}")
        private String appPublicUrl;
        
        @PostMapping
        public ResponseEntity<Map<String, Object>> create(@RequestBody SOPDocuments document) {
            try {

                document.setCreatedAt(timeService.nowVietnam());
                document.setLastEditedAt(null);
                SOPDocuments created = sopDocumentsService.save(document);
                

                Map<String, Object> result = new HashMap<>();
                result.put("documentID", created.getDocumentID());
                result.put("title", created.getTitle());
                result.put("description", created.getDescription());
                result.put("createdAt", created.getCreatedAt());
                result.put("lastEditedAt", created.getLastEditedAt());
                
                if (created.getCreatedBy() != null) {
                    result.put("createdBy", created.getCreatedBy().getFullName());
                }
                if (created.getLastEditedBy() != null) {
                    result.put("lastEditedBy", created.getLastEditedBy().getFullName());
                }
                
                return ResponseEntity.created(URI.create("/api/sop-documents/" + created.getDocumentID())).body(result);
            } catch (Exception e) {
                Map<String, Object> error = new HashMap<>();
                String errorMsg = e.getMessage();
                if ("DUPLICATE_NAME".equals(errorMsg)) {
                    error.put("error", "DUPLICATE_NAME");
                    error.put("duplicateName", document.getTitle());
                } else {
                    error.put("error", errorMsg);
                }
                return ResponseEntity.badRequest().body(error);
            }
        }
        
        @GetMapping
        public ResponseEntity<List<Map<String, Object>>> findAll() {
            List<SOPDocuments> documents = sopDocumentsService.findAll();
            

            List<Map<String, Object>> result = new ArrayList<>();
            for (SOPDocuments doc : documents) {
                Map<String, Object> docMap = new HashMap<>();
                docMap.put("documentID", doc.getDocumentID());
                docMap.put("title", doc.getTitle());
                docMap.put("description", doc.getDescription());
                docMap.put("createdAt", doc.getCreatedAt());
                docMap.put("lastEditedAt", doc.getLastEditedAt());
                
                if (doc.getCreatedBy() != null) {
                    docMap.put("createdBy", doc.getCreatedBy().getFullName());
                }
                if (doc.getLastEditedBy() != null) {
                    docMap.put("lastEditedBy", doc.getLastEditedBy().getFullName());
                }
                
                result.add(docMap);
            }
            
            return ResponseEntity.ok(result);
        }
        
        @GetMapping("/{id}")
        public ResponseEntity<Map<String, Object>> findById(@PathVariable Integer id) {
            SOPDocuments document = sopDocumentsService.findById(id);
            if (document == null) {
                return ResponseEntity.notFound().build();
            }
            

            Map<String, Object> result = new HashMap<>();
            result.put("documentID", document.getDocumentID());
            result.put("title", document.getTitle());
            result.put("description", document.getDescription());
            result.put("createdAt", document.getCreatedAt());
            result.put("lastEditedAt", document.getLastEditedAt());
            
            if (document.getCreatedBy() != null) {
                result.put("createdBy", document.getCreatedBy().getFullName());
            }
            if (document.getLastEditedBy() != null) {
                result.put("lastEditedBy", document.getLastEditedBy().getFullName());
            }
            
            return ResponseEntity.ok(result);
        }
        
        @PutMapping("/{id}")
        public ResponseEntity<Map<String, Object>> update(@PathVariable Integer id, @RequestBody Map<String, Object> updates) {
            try {
                SOPDocuments existing = sopDocumentsService.findById(id);
                if (existing == null) return ResponseEntity.notFound().build();

                String oldTitle = existing.getTitle();
                String oldDescription = existing.getDescription();
                java.time.LocalDateTime oldLastEditedAt = existing.getLastEditedAt();
                String oldLastEditedByName = (existing.getLastEditedBy() != null && existing.getLastEditedBy().getFullName() != null)
                        ? existing.getLastEditedBy().getFullName() : "";
                java.util.List<com.foxconn.sopchecklist.entity.SOPDocumentFiles> oldFilesList = existing.getFiles() != null ? new java.util.ArrayList<>(existing.getFiles()) : java.util.Collections.emptyList();


                Users me = usersService.getCurrentAuthenticatedUser();
                boolean isAdminOrManager = me != null && me.getRoles() != null && me.getRoles().stream().anyMatch(r -> {
                    String n = r.getName();
                    return "ADMIN".equalsIgnoreCase(n) || "MANAGER".equalsIgnoreCase(n);
                });
                if (!isAdminOrManager) {
                    java.time.LocalDateTime pivot = existing.getLastEditedAt();
                    if (pivot == null) pivot = existing.getCreatedAt();
                    if (pivot != null && pivot.isBefore(timeService.nowVietnam().minusDays(editDeleteLimitDays))) {
                        Map<String, Object> error = new HashMap<>();
                        error.put("error", "Bạn không thể sửa. Vui lòng liên hệ admin");
                        return ResponseEntity.status(403).body(error);
                    }
                }
                

                if (updates.containsKey("title")) {
                    existing.setTitle((String) updates.get("title"));
                }
                if (updates.containsKey("description")) {
                    existing.setDescription((String) updates.get("description"));
                }

                existing.setLastEditedAt(timeService.nowVietnam());
                
                // Decide last editor: use explicit value if provided; otherwise default to current user
                if (updates.containsKey("lastEditedBy")) {
                    Integer lastEditedById = (Integer) updates.get("lastEditedBy");
                    if (lastEditedById != null) {
                        try {
                            Users user = usersService.findById(lastEditedById);
                            if (user != null) {
                                existing.setLastEditedBy(user);
                            }
                        } catch (Exception e) { }
                    } else if (me != null) {
                        existing.setLastEditedBy(me);
                    }
                } else if (me != null) {
                    existing.setLastEditedBy(me);
                }
                

                SOPDocuments updatedDocument = sopDocumentsService.update(existing);
                

                if (updates.containsKey("files")) {
                    @SuppressWarnings("unchecked")
                    List<Map<String, Object>> filesData = (List<Map<String, Object>>) updates.get("files");
                    updatedDocument = sopDocumentsService.updateWithFiles(updatedDocument, filesData);
                }
                

                Map<String, Object> result = new HashMap<>();
                result.put("documentID", updatedDocument.getDocumentID());
                result.put("title", updatedDocument.getTitle());
                result.put("description", updatedDocument.getDescription());
                result.put("createdAt", updatedDocument.getCreatedAt());
                result.put("lastEditedAt", updatedDocument.getLastEditedAt());
                
                if (updatedDocument.getCreatedBy() != null) {
                    result.put("createdBy", updatedDocument.getCreatedBy().getFullName());
                }
                if (updatedDocument.getLastEditedBy() != null) {
                    result.put("lastEditedBy", updatedDocument.getLastEditedBy().getFullName());
                }
                
                try {
                    String sopName = updatedDocument.getSop() != null ? updatedDocument.getSop().getName() : "";
                    String subject = "Thông báo thay đổi: " + sopName;

                    StringBuilder body = new StringBuilder();
                    body.append("<div style=\"font-family:Arial,Helvetica,sans-serif;color:#333;line-height:1.6;\">");
                    body.append("<h2 style=\"margin:0 0 12px;\">Thông tin SOPs: ").append(escapeHtml(sopName)).append("</h2>");
                    body.append("<table style=\"border-collapse:collapse;width:100%;\">");
                    body.append("<tr>");
                    body.append("<th style=\"text-align:left;border:1px solid #ddd;padding:8px;background:#f5f5f5;\">Trường</th>");
                    body.append("<th style=\"text-align:left;border:1px solid #ddd;padding:8px;background:#f5f5f5;\">Trước thay đổi</th>");
                    body.append("<th style=\"text-align:left;border:1px solid #ddd;padding:8px;background:#f5f5f5;\">Sau khi thay đổi</th>");
                    body.append("</tr>");

                    // Title diff
                    body.append("<tr>");
                    body.append("<td style=\"border:1px solid #ddd;padding:8px;\">Tên tài liệu</td>");
                    body.append("<td style=\"border:1px solid #ddd;padding:8px;\">").append(escapeHtml(nullToEmpty(oldTitle))).append("</td>");
                    body.append("<td style=\"border:1px solid #ddd;padding:8px;\">").append(escapeHtml(nullToEmpty(updatedDocument.getTitle()))).append("</td>");
                    body.append("</tr>");

                    // Description diff
                    body.append("<tr>");
                    body.append("<td style=\"border:1px solid #ddd;padding:8px;\">Mô tả</td>");
                    body.append("<td style=\"border:1px solid #ddd;padding:8px;\">").append(escapeHtml(nullToEmpty(oldDescription))).append("</td>");
                    body.append("<td style=\"border:1px solid #ddd;padding:8px;\">").append(escapeHtml(nullToEmpty(updatedDocument.getDescription()))).append("</td>");
                    body.append("</tr>");

                    java.time.format.DateTimeFormatter fmt = java.time.format.DateTimeFormatter.ofPattern("dd/MM/yyyy HH:mm");
                    String lastEditedAtStr = updatedDocument.getLastEditedAt() != null ? updatedDocument.getLastEditedAt().format(fmt) : "";
                    String oldLastEditedAtStr = oldLastEditedAt != null ? oldLastEditedAt.format(fmt) : "";
                    String lastEditedByStr = (updatedDocument.getLastEditedBy() != null && updatedDocument.getLastEditedBy().getFullName() != null)
                        ? updatedDocument.getLastEditedBy().getFullName() : "";

                    // Last editor/time rows (no before/after for editor/time, only show current in After col)
                    body.append("<tr>");
                    body.append("<td style=\"border:1px solid #ddd;padding:8px;\">Người sửa lần cuối</td>");
                    body.append("<td style=\"border:1px solid #ddd;padding:8px;\">").append(escapeHtml(oldLastEditedByName)).append("</td>");
                    body.append("<td style=\"border:1px solid #ddd;padding:8px;\">").append(escapeHtml(lastEditedByStr)).append("</td>");
                    body.append("</tr>");

                    body.append("<tr>");
                    body.append("<td style=\"border:1px solid #ddd;padding:8px;\">Thời gian sửa lần cuối</td>");
                    body.append("<td style=\"border:1px solid #ddd;padding:8px;\">").append(escapeHtml(oldLastEditedAtStr)).append("</td>");
                    body.append("<td style=\"border:1px solid #ddd;padding:8px;\">").append(escapeHtml(lastEditedAtStr)).append("</td>");
                    body.append("</tr>");

                    // Files diff
                    java.util.List<String> oldFileNames = new java.util.ArrayList<>();
                    for (com.foxconn.sopchecklist.entity.SOPDocumentFiles f : oldFilesList) {
                        oldFileNames.add(f.getFileName());
                    }
                    java.util.List<String> newFileNames = new java.util.ArrayList<>();
                    if (updatedDocument.getFiles() != null) {
                        for (com.foxconn.sopchecklist.entity.SOPDocumentFiles f : updatedDocument.getFiles()) {
                            newFileNames.add(f.getFileName());
                        }
                    }

                    body.append("<tr>");
                    body.append("<td style=\"border:1px solid #ddd;padding:8px;\">Tệp đính kèm</td>");
                    body.append("<td style=\"border:1px solid #ddd;padding:8px;\">");
                    body.append("<ul style=\"margin:0;padding-left:18px;\">");
                    for (String n : oldFileNames) body.append("<li>").append(escapeHtml(n)).append("</li>");
                    body.append("</ul>");
                    body.append("</td>");
                    body.append("<td style=\"border:1px solid #ddd;padding:8px;\">");
                    body.append("<ul style=\"margin:0;padding-left:18px;\">");
                    for (String n : newFileNames) body.append("<li>").append(escapeHtml(n)).append("</li>");
                    body.append("</ul>");
                    body.append("</td>");
                    body.append("</tr>");

                    body.append("</table>");

                    // Deep link to the updated document in the frontend
                    try {
                        Long sopId = updatedDocument.getSop() != null ? updatedDocument.getSop().getId() : null;
                        Integer docId = updatedDocument.getDocumentID();
                        if (sopId != null && docId != null) {
                            // Use configured URL from application.properties
                            String appBase = appPublicUrl;
                            String link = appBase + "/sops/" + sopId + "?doc=" + docId;
                            body.append("<p style=\"margin-top:12px;\"><a href=\"").append(link)
                                .append("\" style=\"display:inline-block;background:#1677ff;color:#fff;padding:8px 12px;border-radius:4px;text-decoration:none;\">Mở tài liệu vừa cập nhật</a></p>");
                        }
                    } catch (Exception ignore2) {}

                    body.append("<p><strong>Trân trọng,</strong></p>");
                    
                    body.append("</div>");

                    cronMailAllSendService.sendSOPSMail(subject, body.toString(), null);
                } catch (Exception ignore) {}

                return ResponseEntity.ok(result);
            } catch (Exception e) {
                Map<String, Object> error = new HashMap<>();
                String errorMsg = e.getMessage();
                if ("DUPLICATE_NAME".equals(errorMsg)) {
                    error.put("error", "DUPLICATE_NAME");
                    String duplicateName = updates.containsKey("title") ? (String) updates.get("title") : "";
                    if (duplicateName.isEmpty()) {
                        // Fallback: try to get from existing document
                        try {
                            SOPDocuments doc = sopDocumentsService.findById(id);
                            if (doc != null) duplicateName = doc.getTitle();
                        } catch (Exception ignored) {}
                    }
                    error.put("duplicateName", duplicateName);
                } else {
                    error.put("error", errorMsg);
                }
                return ResponseEntity.badRequest().body(error);
            }
        }

        @PostMapping("/{id}/notify")
        public ResponseEntity<Map<String, Object>> notifyDocument(@PathVariable Integer id, @RequestBody Map<String, Object> payload) {
            Map<String, Object> result = new HashMap<>();
            try {
                SOPDocuments doc = sopDocumentsService.findById(id);
                if (doc == null) return ResponseEntity.notFound().build();

                java.util.Set<String> emails = new java.util.HashSet<>();
                java.util.Set<String> ccEmails = new java.util.HashSet<>();
                Object userIds = payload.get("userIds");
                if (userIds instanceof java.util.List<?>) {
                    for (Object o : (java.util.List<?>) userIds) {
                        try {
                            Integer uid = Integer.valueOf(String.valueOf(o));
                            Users u = usersService.findById(uid);
                            if (u != null && u.getEmail() != null) emails.add(u.getEmail());
                        } catch (Exception ignored) {}
                    }
                }
                Object groupIds = payload.get("groupIds");
                if (groupIds instanceof java.util.List<?>) {
                    for (Object o : (java.util.List<?>) groupIds) {
                        try {
                            Long gid = Long.valueOf(String.valueOf(o));
                            com.foxconn.sopchecklist.entity.Group g = groupRepository.findById(gid).orElse(null);
                            if (g != null && g.getUsers() != null) {
                                for (Users u : g.getUsers()) {
                                    if (u.getEmail() != null) emails.add(u.getEmail());
                                }
                            }
                        } catch (Exception ignored) {}
                    }
                }

                // CC from users
                Object ccUserIds = payload.get("ccUserIds");
                if (ccUserIds instanceof java.util.List<?>) {
                    for (Object o : (java.util.List<?>) ccUserIds) {
                        try {
                            Integer uid = Integer.valueOf(String.valueOf(o));
                            Users u = usersService.findById(uid);
                            if (u != null && u.getEmail() != null) ccEmails.add(u.getEmail());
                        } catch (Exception ignored) {}
                    }
                }
                // CC from groups
                Object ccGroupIds = payload.get("ccGroupIds");
                if (ccGroupIds instanceof java.util.List<?>) {
                    for (Object o : (java.util.List<?>) ccGroupIds) {
                        try {
                            Long gid = Long.valueOf(String.valueOf(o));
                            com.foxconn.sopchecklist.entity.Group g = groupRepository.findById(gid).orElse(null);
                            if (g != null && g.getUsers() != null) {
                                for (Users u : g.getUsers()) {
                                    if (u.getEmail() != null) ccEmails.add(u.getEmail());
                                }
                            }
                        } catch (Exception ignored) {}
                    }
                }

                String toCsv = String.join(",", emails);
                String ccCsv = String.join(",", ccEmails);

                String title = doc.getTitle() != null ? doc.getTitle() : ("Document " + id);
                String subject = "Thông báo đã tạo " + title;
                Long sopId = doc.getSop() != null ? doc.getSop().getId() : null;

                // Build rich HTML body like creation mail
                StringBuilder body = new StringBuilder();
                body.append("<div style=\"font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#333;\">");
                body.append("<h3 style=\"margin:0 0 12px;\">").append(escapeHtml(subject)).append("</h3>");
                body.append("<table style=\"width:100%;border-collapse:collapse;\" border=\"1\" cellspacing=\"0\" cellpadding=\"6\">");

                body.append("<tr><td style=\"width:160px;background:#fafafa;font-weight:bold;\">Tên tài liệu</td><td>")
                    .append(escapeHtml(nullToEmpty(doc.getTitle()))).append("</td></tr>");

                String desc = doc.getDescription();
                String descDisplay = (desc != null && !desc.trim().isEmpty()) ? desc : "-";
                body.append("<tr><td style=\"background:#fafafa;font-weight:bold;\">Mô tả</td><td>")
                    .append(escapeHtml(descDisplay)).append("</td></tr>");

                java.time.format.DateTimeFormatter fmt = java.time.format.DateTimeFormatter.ofPattern("dd/MM/yyyy HH:mm");
                String createdAtStr = doc.getCreatedAt() != null ? doc.getCreatedAt().format(fmt) : "";
                body.append("<tr><td style=\"background:#fafafa;font-weight:bold;\">Ngày tạo</td><td>")
                    .append(escapeHtml(createdAtStr)).append("</td></tr>");

                String creator = "";
                try { creator = doc.getCreatedBy() != null ? (doc.getCreatedBy().getFullName() != null ? doc.getCreatedBy().getFullName() : String.valueOf(doc.getCreatedBy().getUserID())) : ""; } catch (Exception ignore) {}
                if (creator != null && !creator.trim().isEmpty()) {
                    body.append("<tr><td style=\"background:#fafafa;font-weight:bold;\">Người tạo</td><td>")
                        .append(escapeHtml(creator)).append("</td></tr>");
                }

                if (doc.getFiles() != null && !doc.getFiles().isEmpty()) {
                    body.append("<tr><td style=\"background:#fafafa;font-weight:bold;\">Tệp đính kèm</td><td>");
                    body.append("<ul style=\"margin:0 0 0 18px;\">");
                    for (com.foxconn.sopchecklist.entity.SOPDocumentFiles f : doc.getFiles()) {
                        try {
                            body.append("<li>").append(escapeHtml(nullToEmpty(f.getFileName()))).append("</li>");
                        } catch (Exception ignore) {}
                    }
                    body.append("</ul>");
                    body.append("</td></tr>");
                }

                body.append("</table>");

                try {
                    Integer docIdVal = doc.getDocumentID();
                    String link = appPublicUrl + "/sops/" + (sopId != null ? sopId : "") + "?doc=" + docIdVal;
                    body.append("<p style=\"margin-top:12px;\"><a href=\"").append(link)
                        .append("\" style=\"display:inline-block;background:#1677ff;color:#fff;padding:8px 12px;border-radius:4px;text-decoration:none;\">Mở tài liệu</a></p>");
                } catch (Exception ignore) {}

                body.append("<p><strong>Trân trọng,</strong></p>");
                body.append("</div>");

                // Use custom to include CC
                cronMailAllSendService.sendMailCustom("SOP", toCsv, ccCsv, null, subject, body.toString(), Long.valueOf(doc.getDocumentID()));
                result.put("success", true);
                result.put("sentTo", toCsv);
                result.put("cc", ccCsv);
                return ResponseEntity.ok(result);
            } catch (Exception e) {
                result.put("success", false);
                result.put("message", e.getMessage());
                return ResponseEntity.internalServerError().body(result);
            }
        }

        private static String nullToEmpty(String value) { return value == null ? "" : value; }
        private static String escapeHtml(String input) {
            if (input == null) return "";
            return input.replace("&", "&amp;")
                .replace("<", "&lt;")
                .replace(">", "&gt;")
                .replace("\"", "&quot;")
                .replace("'", "&#39;");
        }
        
        @DeleteMapping("/{id}")
        public ResponseEntity<Map<String, Object>> delete(@PathVariable Integer id) {
            try {
                SOPDocuments existing = sopDocumentsService.findById(id);
                if (existing == null) return ResponseEntity.notFound().build();


                Users me = usersService.getCurrentAuthenticatedUser();
                boolean isAdminOrManager = me != null && me.getRoles() != null && me.getRoles().stream().anyMatch(r -> {
                    String n = r.getName();
                    return "ADMIN".equalsIgnoreCase(n) || "MANAGER".equalsIgnoreCase(n);
                });
                if (!isAdminOrManager) {
                    java.time.LocalDateTime pivot = existing.getLastEditedAt();
                    if (pivot == null) pivot = existing.getCreatedAt();
                    if (pivot != null && pivot.isBefore(timeService.nowVietnam().minusDays(editDeleteLimitDays))) {
                        Map<String, Object> error = new HashMap<>();
                        error.put("error", "Bạn không thể xóa. Vui lòng liên hệ admin");
                        return ResponseEntity.status(403).body(error);
                    }
                }
                

                int fileCount = existing.getFiles() != null ? existing.getFiles().size() : 0;
                if (fileCount > 0) {
                    Map<String, Object> error = new HashMap<>();
                    error.put("error", "Vui lòng xóa file trước khi xóa.");
                    error.put("fileCount", fileCount);
                    return ResponseEntity.status(400).body(error);
                }
                
                sopDocumentsService.delete(id);

                // Send deletion mail (single-table style + action row)
                try {
                    String sopName = existing.getSop() != null ? existing.getSop().getName() : "";
                    String subject = "Thông báo xóa tài liệu: " + sopName;

                    java.time.format.DateTimeFormatter fmt = java.time.format.DateTimeFormatter.ofPattern("dd/MM/yyyy HH:mm");
                    String when = timeService.nowVietnam() != null ? timeService.nowVietnam().format(fmt) : "";
                    String who = (existing.getLastEditedBy() != null && existing.getLastEditedBy().getFullName() != null)
                            ? existing.getLastEditedBy().getFullName()
                            : (existing.getCreatedBy() != null && existing.getCreatedBy().getFullName() != null)
                                ? existing.getCreatedBy().getFullName()
                                : "";

                    StringBuilder body = new StringBuilder();
                    body.append("<div style=\"font-family:Arial,Helvetica,sans-serif;color:#333;line-height:1.6;\">");
                    body.append("<h2 style=\"margin:0 0 12px;\">Thông tin SOPs: ")
                        .append(escapeHtml(sopName))
                        .append("</h2>");
                    body.append("<table style=\"border-collapse:collapse;width:100%;\">");

                    body.append("<tr>");
                    body.append("<td style=\"border:1px solid #ddd;padding:8px;\">Hành động</td>");
                    body.append("<td style=\"border:1px solid #ddd;padding:8px;\">ĐÃ XÓA TÀI LIỆU</td>");
                    body.append("</tr>");

                    body.append("<tr>");
                    body.append("<td style=\"border:1px solid #ddd;padding:8px;\">Tên tài liệu</td>");
                    body.append("<td style=\"border:1px solid #ddd;padding:8px;\">").append(escapeHtml(nullToEmpty(existing.getTitle()))).append("</td>");
                    body.append("</tr>");

                    body.append("<tr>");
                    body.append("<td style=\"border:1px solid #ddd;padding:8px;\">Mô tả</td>");
                    body.append("<td style=\"border:1px solid #ddd;padding:8px;\">").append(escapeHtml(nullToEmpty(existing.getDescription()))).append("</td>");
                    body.append("</tr>");

                    body.append("<tr>");
                    body.append("<td style=\"border:1px solid #ddd;padding:8px;\">Người thao tác</td>");
                    body.append("<td style=\"border:1px solid #ddd;padding:8px;\">").append(escapeHtml(who)).append("</td>");
                    body.append("</tr>");

                    body.append("<tr>");
                    body.append("<td style=\"border:1px solid #ddd;padding:8px;\">Thời gian thao tác</td>");
                    body.append("<td style=\"border:1px solid #ddd;padding:8px;\">").append(escapeHtml(when)).append("</td>");
                    body.append("</tr>");

                    if (existing.getFiles() != null && !existing.getFiles().isEmpty()) {
                        body.append("<tr>");
                        body.append("<td style=\"border:1px solid #ddd;padding:8px;\">Tệp đính kèm</td>");
                        body.append("<td style=\"border:1px solid #ddd;padding:8px;\">");
                        body.append("<ul style=\"margin:0;padding-left:18px;\">");
                        for (com.foxconn.sopchecklist.entity.SOPDocumentFiles f : existing.getFiles()) {
                            body.append("<li>").append(escapeHtml(nullToEmpty(f.getFileName()))).append("</li>");
                        }
                        body.append("</ul>");
                        body.append("</td>");
                        body.append("</tr>");
                    }

                    body.append("</table>");

                    // Deep link button to document list for this SOP after deletion
                    try {
                        Long sopId = existing.getSop() != null ? existing.getSop().getId() : null;
                        if (sopId != null) {
                            // Use configured URL from application.properties
                            String appBase = appPublicUrl;
                            String link = appBase + "/sops/" + sopId;
                            body.append("<p style=\"margin-top:12px;\"><a href=\"").append(link)
                                .append("\" style=\"display:inline-block;background:#1677ff;color:#fff;padding:8px 12px;border-radius:4px;text-decoration:none;\">Mở danh sách tài liệu</a></p>");
                        }
                    } catch (Exception ignore2) {}

                    body.append("<p><strong>Trân trọng,</strong></p>");
                    
                    body.append("</div>");

                    cronMailAllSendService.sendSOPSMail(subject, body.toString(), null);
                } catch (Exception ignored) { }
                

                Map<String, Object> result = new HashMap<>();
                result.put("message", "SOP Document deleted successfully");
                result.put("deletedFiles", fileCount);
                
                return ResponseEntity.ok(result);
            } catch (Exception e) {
                Map<String, Object> error = new HashMap<>();
                error.put("error", "Failed to delete SOP Document: " + e.getMessage());
                return ResponseEntity.badRequest().body(error);
            }
        }
    }

}

