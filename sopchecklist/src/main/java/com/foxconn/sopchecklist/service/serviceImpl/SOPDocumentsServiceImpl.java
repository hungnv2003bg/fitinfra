package com.foxconn.sopchecklist.service.serviceImpl;

import com.foxconn.sopchecklist.entity.SOPDocuments;
import com.foxconn.sopchecklist.entity.SOPDocumentFiles;
import com.foxconn.sopchecklist.entity.Users;
import com.foxconn.sopchecklist.entity.SOPs;
import com.foxconn.sopchecklist.repository.SOPDocumentsRepository;
import com.foxconn.sopchecklist.service.SOPDocumentsService;
import com.foxconn.sopchecklist.service.SOPDocumentFilesService;
import com.foxconn.sopchecklist.service.UsersService;
import com.foxconn.sopchecklist.service.SOPsService;
import org.springframework.beans.factory.annotation.Autowired;
import com.foxconn.sopchecklist.service.FileStorageService;
import com.foxconn.sopchecklist.service.TimeService;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.util.List;
import java.util.Map;

@Service
public class SOPDocumentsServiceImpl implements SOPDocumentsService {

    @Autowired
    private SOPDocumentsRepository sopDocumentsRepository;
    
    @Autowired
    private SOPDocumentFilesService sopDocumentFilesService;
    
    @Autowired
    private UsersService usersService;
    
    @Autowired
    private SOPsService sopsService;

    @Autowired
    private FileStorageService fileStorageService;
    
    @Autowired
    private TimeService timeService;

    @Autowired
    private com.foxconn.sopchecklist.service.MailService mailService;

    @Override
    public SOPDocuments findById(Integer id) {
        return sopDocumentsRepository.findById(id).orElse(null);
    }

    @Override
    @Transactional
    public SOPDocuments save(SOPDocuments document) {
        try {

            if (document.getCreatedBy() != null && document.getCreatedBy().getUserID() != null) {
                Users user = usersService.findById(document.getCreatedBy().getUserID());
                if (user != null) {
                    document.setCreatedBy(user);
                }
            }
            

            if (document.getSop() != null && document.getSop().getId() != null) {
                SOPs sop = sopsService.findById(document.getSop().getId());
                if (sop != null) {
                    document.setSop(sop);
                }
            }
            

            List<SOPDocumentFiles> filesToSave = document.getFiles();
            document.setFiles(null);

            if (document.getSop() == null || document.getSop().getId() == null) {
                throw new RuntimeException("SOP is required");
            }
            Long sopId = document.getSop().getId();
            String normalizedTitle = document.getTitle() != null ? document.getTitle().trim() : "";
            if (normalizedTitle.isEmpty()) {
                throw new RuntimeException("Title is required");
            }
            if (sopDocumentsRepository.existsBySop_IdAndTitleIgnoreCase(sopId, normalizedTitle)) {
                throw new RuntimeException("Vui lòng đặt tên tài liệu khác !");
            }

            SOPDocuments savedDocument = sopDocumentsRepository.saveAndFlush(document);
            

            if (filesToSave != null && !filesToSave.isEmpty()) {
                for (SOPDocumentFiles file : filesToSave) {
                    file.setDocument(savedDocument);

                    if (file.getCreatedAt() == null) {
                        file.setCreatedAt(timeService.nowVietnam());
                    }
                    sopDocumentFilesService.save(file);
                }

                savedDocument.setFiles(filesToSave);
            }
            

            sopDocumentsRepository.flush();

            try {
                String sopName = savedDocument.getSop() != null ? savedDocument.getSop().getName() : "";
                String subject = "Thông báo thay đổi: " + sopName;

                StringBuilder body = new StringBuilder();
                body.append("<div style=\"font-family:Arial,Helvetica,sans-serif;color:#333;line-height:1.6;\">");
                body.append("<h2 style=\"margin:0 0 12px;\">Thông tin SOPs: ")
                    .append(escapeHtml(sopName))
                    .append("</h2>");
                body.append("<table style=\"border-collapse:collapse;width:100%;\">");

                body.append("<tr>");
                body.append("<td style=\"border:1px solid #ddd;padding:8px;\">Tên tài liệu</td>");
                body.append("<td style=\"border:1px solid #ddd;padding:8px;\">").append(escapeHtml(nullToEmpty(savedDocument.getTitle()))).append("</td>");
                body.append("</tr>");

                body.append("<tr>");
                body.append("<td style=\"border:1px solid #ddd;padding:8px;\">Mô tả</td>");
                body.append("<td style=\"border:1px solid #ddd;padding:8px;\">").append(escapeHtml(nullToEmpty(savedDocument.getDescription()))).append("</td>");
                body.append("</tr>");

                java.time.format.DateTimeFormatter fmt = java.time.format.DateTimeFormatter.ofPattern("dd/MM/yyyy HH:mm");
                String createdAtStr = savedDocument.getCreatedAt() != null ? savedDocument.getCreatedAt().format(fmt) : "";
                String createdByStr = (savedDocument.getCreatedBy() != null && savedDocument.getCreatedBy().getFullName() != null)
                        ? savedDocument.getCreatedBy().getFullName() : "";

                body.append("<tr>");
                body.append("<td style=\"border:1px solid #ddd;padding:8px;\">Ngày tạo</td>");
                body.append("<td style=\"border:1px solid #ddd;padding:8px;\">").append(escapeHtml(createdAtStr)).append("</td>");
                body.append("</tr>");

                body.append("<tr>");
                body.append("<td style=\"border:1px solid #ddd;padding:8px;\">Người tạo</td>");
                body.append("<td style=\"border:1px solid #ddd;padding:8px;\">").append(escapeHtml(createdByStr)).append("</td>");
                body.append("</tr>");

                if (filesToSave != null && !filesToSave.isEmpty()) {
                    body.append("<tr>");
                    body.append("<td style=\"border:1px solid #ddd;padding:8px;\">Tệp đính kèm</td>");
                    body.append("<td style=\"border:1px solid #ddd;padding:8px;\">");
                    body.append("<ul style=\"margin:0;padding-left:18px;\">");
                    for (SOPDocumentFiles f : filesToSave) {
                        body.append("<li>").append(escapeHtml(nullToEmpty(f.getFileName()))).append("</li>");
                    }
                    body.append("</ul>");
                    body.append("</td>");
                    body.append("</tr>");
                }

                body.append("</table>");

                // Deep link to the newly created document
                try {
                    Long sopIdMail = savedDocument.getSop() != null ? savedDocument.getSop().getId() : null;
                    Integer docId = savedDocument.getDocumentID();
                    if (sopIdMail != null && docId != null) {
                        String appBase = System.getenv("APP_PUBLIC_URL");
                        if (appBase == null || appBase.trim().isEmpty()) {
                            appBase = "http://" + java.net.InetAddress.getLocalHost().getHostAddress() + ":3000";
                        }
                        String link = appBase + "/sops/" + sopIdMail + "?doc=" + docId;
                        body.append("<p style=\"margin-top:12px;\"><a href=\"").append(link)
                            .append("\" style=\"display:inline-block;background:#1677ff;color:#fff;padding:8px 12px;border-radius:4px;text-decoration:none;\">Mở tài liệu vừa tạo</a></p>");
                    }
                } catch (Exception ignore) {}

                body.append("<p><strong>Trân trọng,</strong></p>");
                body.append("</div>");

                mailService.createMail(subject, body.toString());
            } catch (Exception ex) {
            }

            return savedDocument;
        } catch (Exception e) {
            throw new RuntimeException(" " + e.getMessage());
        }
    }

    @Override
    public SOPDocuments update(SOPDocuments document) {
        if (document.getSop() != null && document.getSop().getId() != null && document.getDocumentID() != null) {
            Long sopId = document.getSop().getId();
            String normalizedTitle = document.getTitle() != null ? document.getTitle().trim() : "";
            if (sopDocumentsRepository.existsBySop_IdAndTitleIgnoreCaseAndDocumentIDNot(sopId, normalizedTitle, document.getDocumentID())) {
                throw new RuntimeException("Vui lòng đặt tên tài liệu khác !");
            }
        }
        return sopDocumentsRepository.save(document);
    }

    @Override
    @Transactional
    public SOPDocuments updateWithFiles(SOPDocuments document, List<Map<String, Object>> filesData) {
        try {

            SOPDocuments existingDocument = sopDocumentsRepository.findById(document.getDocumentID()).orElse(null);
            if (existingDocument == null) {
                throw new RuntimeException("Document not found");
            }
            

            java.util.Set<String> newPaths = new java.util.HashSet<>();
            for (Map<String, Object> fileData : filesData) {
                String path = (String) fileData.get("filePath");
                if (path != null) newPaths.add(path);
            }

            if (existingDocument.getFiles() != null) {
                for (SOPDocumentFiles existingFile : new java.util.ArrayList<>(existingDocument.getFiles())) {
                    if (!newPaths.contains(existingFile.getFilePath())) {
                        try { fileStorageService.deleteByUrl(existingFile.getFilePath()); } catch (Exception ignored) {}
                    }
                }
            }


            java.util.Map<String, java.time.LocalDateTime> existingFileCreatedDates = new java.util.HashMap<>();
            if (existingDocument.getFiles() != null) {
                for (SOPDocumentFiles existingFile : existingDocument.getFiles()) {
                    existingFileCreatedDates.put(existingFile.getFilePath(), existingFile.getCreatedAt());
                }
            }
            

            existingDocument.getFiles().clear();
            

            for (Map<String, Object> fileData : filesData) {
                SOPDocumentFiles file = new SOPDocumentFiles();
                file.setDocument(existingDocument);
                file.setFilePath((String) fileData.get("filePath"));
                file.setFileName((String) fileData.get("fileName"));
                file.setFileType((String) fileData.get("fileType"));
                file.setFileSize(((Number) fileData.get("fileSize")).longValue());
                

                String filePath = (String) fileData.get("filePath");
                if (existingFileCreatedDates.containsKey(filePath)) {
                    file.setCreatedAt(existingFileCreatedDates.get(filePath));
                } else {
                    file.setCreatedAt(timeService.nowVietnam());
                }
                
                existingDocument.getFiles().add(file);
            }
            

            return sopDocumentsRepository.save(existingDocument);
        } catch (Exception e) {
            throw new RuntimeException("Error updating SOP document with files: " + e.getMessage());
        }
    }

    @Override
    public void delete(Integer id) {

        SOPDocuments document = sopDocumentsRepository.findById(id).orElse(null);
        if (document != null) {

            if (document.getFiles() != null && !document.getFiles().isEmpty()) {
                throw new RuntimeException("Cannot delete SOP Document with existing files. Please delete all files first via Edit.");
            }
            sopDocumentsRepository.delete(document);
        }
    }

    @Override
    public List<SOPDocuments> findAll() {
        return sopDocumentsRepository.findAll();
    }

    private static String nullToEmpty(String value) {
        return value == null ? "" : value;
    }

    private static String escapeHtml(String input) {
        if (input == null) return "";
        return input
            .replace("&", "&amp;")
            .replace("<", "&lt;")
            .replace(">", "&gt;")
            .replace("\"", "&quot;")
            .replace("'", "&#39;");
    }
}

