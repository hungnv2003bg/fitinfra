package com.foxconn.sopchecklist.controller;

import org.apache.commons.net.ftp.FTP;
import org.apache.commons.net.ftp.FTPClient;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.ByteArrayResource;
import org.springframework.core.io.Resource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import javax.servlet.http.HttpServletRequest;
import java.io.ByteArrayOutputStream;
import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/improvement-upload")
@CrossOrigin
public class ImprovementUploadController {

    private static final Logger logger = LoggerFactory.getLogger(ImprovementUploadController.class);
    
    @Value("${storage.use-ftp:false}")
    private boolean useFtp;

    @Value("${ftp.host:}")
    private String ftpHost;

    @Value("${ftp.port:21}")
    private int ftpPort;

    @Value("${ftp.username:}")
    private String ftpUsername;

    @Value("${ftp.password:}")
    private String ftpPassword;

    @Value("${ftp.improvement-upload-dir:upload_fitimprovement}")
    private String ftpImprovementUploadDir;

    @PostMapping
    public ResponseEntity<?> upload(@RequestParam("file") MultipartFile file,
                                    @RequestParam(value = "improvementName", required = false) String improvementName) {
        try {
            String preferredFolder = (improvementName != null && !improvementName.isEmpty())
                    ? improvementName
                    : "General";
            
            String url = storeFileInFtp(file, preferredFolder);
            Map<String, Object> body = new HashMap<>();
            body.put("url", url);
            body.put("name", file.getOriginalFilename());
            
            return ResponseEntity.ok(body);
        } catch (Exception e) {
            logger.error("Improvement upload error: {}", e.getMessage(), e);
            Map<String, Object> err = new HashMap<>();
            err.put("error", e.getMessage());
            return ResponseEntity.badRequest().body(err);
        }
    }

    @GetMapping("/file/**")
    public ResponseEntity<Resource> downloadFile(HttpServletRequest request) {
        try {
            String requestURI = request.getRequestURI();
            String filePath = requestURI.substring(requestURI.indexOf("/file/") + 6);
            filePath = java.net.URLDecoder.decode(filePath, "UTF-8");

            if (useFtp) {
                return serveFileFromFtp(filePath);
            }

            return ResponseEntity.notFound().build();
        } catch (Exception e) {
            logger.error("Improvement download error: {}", e.getMessage(), e);
            return ResponseEntity.badRequest().build();
        }
    }

    private String storeFileInFtp(MultipartFile file, String folderName) throws Exception {
        FTPClient ftp = new FTPClient();
        try {
            ftp.setConnectTimeout(30000);
            ftp.setControlEncoding("UTF-8");
            ftp.connect(ftpHost, ftpPort);
            
            if (!ftp.login(ftpUsername, ftpPassword)) {
                throw new Exception("FTP login failed");
            }
            
            ftp.enterLocalPassiveMode();
            ftp.setFileType(FTP.BINARY_FILE_TYPE);
            
            if (!ftp.changeWorkingDirectory(ftpImprovementUploadDir)) {
                logger.warn("Cannot change to improvement upload directory: {}, creating it", ftpImprovementUploadDir);
                if (!ftp.makeDirectory(ftpImprovementUploadDir)) {
                    throw new Exception("Cannot create improvement upload directory: " + ftpImprovementUploadDir);
                }
                if (!ftp.changeWorkingDirectory(ftpImprovementUploadDir)) {
                    throw new Exception("Cannot change to improvement upload directory: " + ftpImprovementUploadDir);
                }
            }
            
            if (!ftp.changeWorkingDirectory(folderName)) {
                if (!ftp.makeDirectory(folderName)) {
                    throw new Exception("Cannot create folder: " + folderName);
                }
                if (!ftp.changeWorkingDirectory(folderName)) {
                    throw new Exception("Cannot change to folder: " + folderName);
                }
            }
            
            boolean success = ftp.storeFile(file.getOriginalFilename(), file.getInputStream());
            if (!success) {
                throw new Exception("Cannot store file: " + file.getOriginalFilename());
            }
            
            String url = "/files/" + ftpImprovementUploadDir + "/" + folderName + "/" + file.getOriginalFilename();
            logger.info("Successfully uploaded improvement file: {}", url);
            
            return url;
            
        } finally {
            if (ftp.isConnected()) {
                try { ftp.logout(); } catch (Exception ignored) {}
                try { ftp.disconnect(); } catch (Exception ignored) {}
            }
        }
    }

    private ResponseEntity<Resource> serveFileFromFtp(String filePath) {
        FTPClient ftp = new FTPClient();
        try {
            ftp.setConnectTimeout(30000);
            ftp.setControlEncoding("UTF-8");
            ftp.connect(ftpHost, ftpPort);
            
            if (!ftp.login(ftpUsername, ftpPassword)) {
                logger.error("FTP login failed");
                return ResponseEntity.notFound().build();
            }
            
            ftp.enterLocalPassiveMode();
            ftp.setFileType(FTP.BINARY_FILE_TYPE);
            
            if (!ftp.changeWorkingDirectory(ftpImprovementUploadDir)) {
                logger.error("Cannot change to improvement upload directory: {}", ftpImprovementUploadDir);
                return ResponseEntity.notFound().build();
            }
            
            String[] parts = filePath.split("/");
            if (parts.length < 2) {
                logger.error("Invalid file path: {}", filePath);
                return ResponseEntity.notFound().build();
            }
            
            for (int i = 0; i < parts.length - 1; i++) {
                if (!ftp.changeWorkingDirectory(parts[i])) {
                    logger.error("Cannot change to FTP subdirectory: {}", parts[i]);
                    return ResponseEntity.notFound().build();
                }
            }
            
            String fileName = parts[parts.length - 1];
            ByteArrayOutputStream outputStream = new ByteArrayOutputStream();
            boolean success = ftp.retrieveFile(fileName, outputStream);
            if (!success) {
                logger.error("Cannot retrieve file from FTP: {}", fileName);
                return ResponseEntity.notFound().build();
            }
            
            byte[] fileBytes = outputStream.toByteArray();
            ByteArrayResource resource = new ByteArrayResource(fileBytes);
            
            String contentType = guessContentType(fileName);
            String encodedFileName = java.net.URLEncoder.encode(fileName, "UTF-8").replaceAll("\\+", "%20");
            
            return ResponseEntity.ok()
                    .contentType(MediaType.parseMediaType(contentType))
                    .header(HttpHeaders.CONTENT_DISPOSITION,
                            "attachment; filename=\"" + fileName + "\"; filename*=UTF-8''" + encodedFileName)
                    .body(resource);
                    
        } catch (Exception e) {
            logger.error("FTP download error: {}", e.getMessage(), e);
            return ResponseEntity.notFound().build();
        } finally {
            if (ftp.isConnected()) {
                try { ftp.logout(); } catch (Exception ignored) {}
                try { ftp.disconnect(); } catch (Exception ignored) {}
            }
        }
    }

    private String guessContentType(String fileName) {
        String lower = fileName.toLowerCase();
        if (lower.endsWith(".txt")) return "application/octet-stream";
        if (lower.endsWith(".pdf")) return "application/pdf";
        if (lower.endsWith(".docx")) return "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
        if (lower.endsWith(".doc")) return "application/msword";
        if (lower.endsWith(".pptx")) return "application/vnd.openxmlformats-officedocument.presentationml.presentation";
        if (lower.endsWith(".ppt")) return "application/vnd.ms-powerpoint";
        if (lower.endsWith(".xlsx")) return "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
        if (lower.endsWith(".xls")) return "application/vnd.ms-excel";
        if (lower.endsWith(".png")) return "image/png";
        if (lower.endsWith(".jpg") || lower.endsWith(".jpeg")) return "image/jpeg";
        return "application/octet-stream";
    }
}
