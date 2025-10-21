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
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import javax.servlet.http.HttpServletRequest;
import java.io.ByteArrayOutputStream;

@RestController
@CrossOrigin
public class FilesController {

    private static final Logger logger = LoggerFactory.getLogger(FilesController.class);
    
    // Always use FTP for serving files
    
    @Value("${ftp.host:}")
    private String ftpHost;
    
    @Value("${ftp.port:21}")
    private int ftpPort;
    
    @Value("${ftp.username:}")
    private String ftpUsername;
    
    @Value("${ftp.password:}")
    private String ftpPassword;
    
    @Value("${ftp.checklist-upload-dir:upload_fitchecklist}")
    private String ftpChecklistUploadDir;

    @Value("${ftp.upload-dir:uploads_fitsops}")
    private String ftpSopUploadDir;

    // Add dedicated improvement dir as optional root
    @Value("${ftp.improvement-upload-dir:upload_fitimprovement}")
    private String ftpImprovementUploadDir;

    @GetMapping("/files/**")
    public ResponseEntity<Resource> serveFile(HttpServletRequest request) {
        try {
            String requestURI = request.getRequestURI();
            String filePath = requestURI.substring(requestURI.indexOf("/files/") + 7);
            
            filePath = java.net.URLDecoder.decode(filePath, "UTF-8");
            return serveFileFromFtp(filePath);
        } catch (Exception e) {
            logger.error("File serving error: {}", e.getMessage(), e);
            return ResponseEntity.badRequest().build();
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
            
            // Try improvement dir first, then SOP dir, then checklist dir
            ByteArrayResource resource = tryFetchFromRoot(ftp, ftpImprovementUploadDir, filePath);
            if (resource == null) {
                resource = tryFetchFromRoot(ftp, ftpSopUploadDir, filePath);
            }
            if (resource == null) {
                resource = tryFetchFromRoot(ftp, ftpChecklistUploadDir, filePath);
            }
            
            if (resource == null) {
                logger.error("Cannot retrieve file from FTP (not found in all roots): {}", filePath);
                return ResponseEntity.notFound().build();
            }
            
            String fileName = filePath.substring(filePath.lastIndexOf('/') + 1);
            String contentType = getContentType(fileName);
            String encodedFileName = java.net.URLEncoder.encode(fileName, "UTF-8")
                .replaceAll("\\+", "%20");
            
            logger.info("Successfully retrieved file from FTP: {}", filePath);
            
            return ResponseEntity.ok()
                    .contentType(MediaType.parseMediaType(contentType))
                    .header(HttpHeaders.CONTENT_DISPOSITION, 
                        "attachment; filename=\"" + fileName + "\"; filename*=UTF-8''" + encodedFileName)
                    .body(resource);
                    
        } catch (Exception e) {
            logger.error("FTP file serving error: {}", e.getMessage(), e);
            return ResponseEntity.notFound().build();
        } finally {
            if (ftp.isConnected()) {
                try { ftp.logout(); } catch (Exception ignored) {}
                try { ftp.disconnect(); } catch (Exception ignored) {}
            }
        }
    }
    
    private ByteArrayResource tryFetchFromRoot(FTPClient ftp, String rootDir, String filePath) {
        try {
            if (rootDir == null || rootDir.isEmpty()) return null;
            if (!ftp.changeWorkingDirectory(rootDir)) {
                logger.warn("Cannot change to FTP root dir: {}", rootDir);
                return null;
            }
            
            String[] pathParts = filePath.split("/");
            if (pathParts.length < 2) {
                logger.error("Invalid file path: {}", filePath);
                return null;
            }
            
            for (int i = 0; i < pathParts.length - 1; i++) {
                if (!ftp.changeWorkingDirectory(pathParts[i])) {
                    logger.warn("Subdir not found under {}: {}", rootDir, pathParts[i]);
                    return null; // fallback to another root
                }
            }
            
            String fileName = pathParts[pathParts.length - 1];
            ByteArrayOutputStream outputStream = new ByteArrayOutputStream();
            boolean success = ftp.retrieveFile(fileName, outputStream);
            if (!success) {
                logger.warn("File not found under {}: {}", rootDir, fileName);
                return null;
            }
            return new ByteArrayResource(outputStream.toByteArray());
        } catch (Exception e) {
            logger.warn("Error fetching from root {}: {}", rootDir, e.getMessage());
            return null;
        } finally {
            try { ftp.changeWorkingDirectory("/"); } catch (Exception ignored) {}
        }
    }
    
    private String getContentType(String fileName) {
        String lowerFileName = fileName.toLowerCase();
        if (lowerFileName.endsWith(".txt")) {
            // Force download for .txt instead of rendering inline in some browsers
            return "application/octet-stream";
        } else if (lowerFileName.endsWith(".pdf")) {
            return "application/pdf";
        } else if (lowerFileName.endsWith(".docx")) {
            return "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
        } else if (lowerFileName.endsWith(".doc")) {
            return "application/msword";
        } else if (lowerFileName.endsWith(".pptx")) {
            return "application/vnd.openxmlformats-officedocument.presentationml.presentation";
        } else if (lowerFileName.endsWith(".ppt")) {
            return "application/vnd.ms-powerpoint";
        } else if (lowerFileName.endsWith(".xlsx")) {
            return "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
        } else if (lowerFileName.endsWith(".xls")) {
            return "application/vnd.ms-excel";
        } else if (lowerFileName.endsWith(".png")) {
            return "image/png";
        } else if (lowerFileName.endsWith(".jpg") || lowerFileName.endsWith(".jpeg")) {
            return "image/jpeg";
        } else {
            return "application/octet-stream";
        }
    }
}