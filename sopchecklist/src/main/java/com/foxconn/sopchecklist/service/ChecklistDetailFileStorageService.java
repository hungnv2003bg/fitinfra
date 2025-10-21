package com.foxconn.sopchecklist.service;

import org.apache.commons.net.ftp.FTP;
import org.apache.commons.net.ftp.FTPClient;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.io.InputStream;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardCopyOption;
import java.time.LocalDate;

@Service
public class ChecklistDetailFileStorageService {

    private final Path rootLocation;

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

    // Sử dụng FTP directory riêng cho ChecklistDetail
    @Value("${ftp.checklist-upload-dir:upload_fitchecklist}")
    private String ftpUploadDir;

    public ChecklistDetailFileStorageService(@Value("${file.upload-dir:uploads}") String uploadDir) throws IOException {
        this.rootLocation = Paths.get(uploadDir).toAbsolutePath().normalize();
    }

    public String storeInFolder(MultipartFile file, String preferredFolderName) throws IOException {
        if (file == null || file.isEmpty()) {
            throw new IOException("Empty file");
        }

        String originalFilename = file.getOriginalFilename();
        String original = StringUtils.cleanPath(originalFilename != null ? originalFilename : "file");

        String ext = "";
        String base = original;
        int dot = original.lastIndexOf('.');
        if (dot >= 0) {
            ext = original.substring(dot);
            base = original.substring(0, dot);
        }

        String safeFolder = sanitizeFolderName(preferredFolderName);
        if (safeFolder == null || safeFolder.isEmpty()) {
            safeFolder = LocalDate.now().toString();
        }

        String sanitizedBase = toAsciiContinuous(base);
        if (sanitizedBase.isEmpty()) sanitizedBase = "file";
        String filename = sanitizedBase + ext.toLowerCase();

        // When FTP is enabled, upload directly to FTP and do NOT persist a local copy
        if (useFtp) {
            try (InputStream in = file.getInputStream()) {
                uploadToFtpStream(safeFolder, filename, in);
            } catch (Exception e) {
                throw new IOException("FTP upload failed: " + e.getMessage(), e);
            }
        } else {
            // Local storage path (used only when FTP disabled)
            Path targetDir = this.rootLocation.resolve(safeFolder);
            Files.createDirectories(targetDir);

            Path target = targetDir.resolve(filename);
            if (!target.normalize().startsWith(this.rootLocation)) {
                throw new IOException("Invalid path");
            }
            Files.copy(file.getInputStream(), target, StandardCopyOption.REPLACE_EXISTING);
        }

        return "/files/" + safeFolder + "/" + filename;
    }

    private String sanitizeFolderName(String raw) {
        if (raw == null) return null;
        String trimmed = raw.trim();
        if (trimmed.isEmpty()) return "";
        
        String cleaned = toAsciiContinuous(trimmed);
        cleaned = cleaned.replaceAll("^[._-]+|[._-]+$", "");
        
        if (cleaned.isEmpty()) return "";
        
        return cleaned.length() > 100 ? cleaned.substring(0, 100) : cleaned;
    }

    private String toAsciiContinuous(String input) {
        if (input == null || input.trim().isEmpty()) {
            return "";
        }
        
        String cleaned = input.trim()
                .replaceAll("[<>:\"/\\\\|?*]", "")
                .replaceAll("\\s+", "_")
                .replaceAll("_{2,}", "_")
                .replaceAll("^_+|_+$", "");
        
        if (cleaned.isEmpty()) {
            return "file";
        }
        
        return cleaned;
    }

    private void uploadToFtp(String dateFolder, String filename, Path localFile) throws IOException {
        FTPClient ftp = new FTPClient();
        try {
            ftp.setConnectTimeout(30000);
            ftp.setControlEncoding("UTF-8");
            ftp.connect(ftpHost, ftpPort);
            if (!ftp.login(ftpUsername, ftpPassword)) {
                throw new IOException("FTP login failed");
            }
            ftp.enterLocalPassiveMode();
            ftp.setFileType(FTP.BINARY_FILE_TYPE);

            // Sử dụng FTP directory riêng cho ChecklistDetail
            changeOrMakeDirectories(ftp, ftpUploadDir, dateFolder);

            try (InputStream input = Files.newInputStream(localFile)) {
                if (!ftp.storeFile(filename, input)) {
                    throw new IOException("FTP storeFile failed: " + ftp.getReplyString());
                }
            }
        } finally {
            if (ftp.isConnected()) {
                try { ftp.logout(); } catch (Exception ignored) {}
                try { ftp.disconnect(); } catch (Exception ignored) {}
            }
        }
    }

    private void uploadToFtpStream(String dateFolder, String filename, InputStream inputStream) throws IOException {
        FTPClient ftp = new FTPClient();
        try {
            ftp.setConnectTimeout(30000);
            ftp.setControlEncoding("UTF-8");
            ftp.connect(ftpHost, ftpPort);
            if (!ftp.login(ftpUsername, ftpPassword)) {
                throw new IOException("FTP login failed");
            }
            ftp.enterLocalPassiveMode();
            ftp.setFileType(FTP.BINARY_FILE_TYPE);

            changeOrMakeDirectories(ftp, ftpUploadDir, dateFolder);

            if (!ftp.storeFile(filename, inputStream)) {
                throw new IOException("FTP storeFile failed: " + ftp.getReplyString());
            }
        } finally {
            if (ftp.isConnected()) {
                try { ftp.logout(); } catch (Exception ignored) {}
                try { ftp.disconnect(); } catch (Exception ignored) {}
            }
        }
    }

    private void changeOrMakeDirectories(FTPClient ftp, String... directories) throws IOException {
        for (String dir : directories) {
            if (dir == null || dir.isEmpty()) continue;
            if (!ftp.changeWorkingDirectory(dir)) {
                if (!ftp.makeDirectory(dir)) {
                    throw new IOException("Could not create FTP directory: " + dir + " - " + ftp.getReplyString());
                }
                if (!ftp.changeWorkingDirectory(dir)) {
                    throw new IOException("Could not CWD into FTP directory: " + dir + " - " + ftp.getReplyString());
                }
            }
        }
    }

    public void deleteByUrl(String url) throws IOException {
        if (url == null || !url.startsWith("/files/")) return;
        String relative = url.substring("/files/".length());
        if (!useFtp) {
            Path localPath = this.rootLocation.resolve(relative).normalize();
            if (localPath.startsWith(this.rootLocation)) {
                try { Files.deleteIfExists(localPath); } catch (Exception ignored) {}
            }
        }

        if (useFtp) {
            int slash = relative.lastIndexOf('/');
            if (slash > 0) {
                String folder = relative.substring(0, slash);
                String name = relative.substring(slash + 1);
                deleteFromFtp(folder, name);
            }
        }
    }

    private void deleteFromFtp(String folder, String filename) throws IOException {
        FTPClient ftp = new FTPClient();
        try {
            ftp.setConnectTimeout(30000);
            ftp.connect(ftpHost, ftpPort);
            if (!ftp.login(ftpUsername, ftpPassword)) {
                throw new IOException("FTP login failed");
            }
            ftp.enterLocalPassiveMode();
            ftp.setFileType(FTP.BINARY_FILE_TYPE);

            changeOrMakeDirectories(ftp, ftpUploadDir);
            for (String part : folder.split("/")) {
                if (part == null || part.isEmpty()) continue;
                if (!ftp.changeWorkingDirectory(part)) {
                    return;
                }
            }
            try { ftp.deleteFile(filename); } catch (Exception ignored) {}
        } finally {
            if (ftp.isConnected()) {
                try { ftp.logout(); } catch (Exception ignored) {}
                try { ftp.disconnect(); } catch (Exception ignored) {}
            }
        }
    }
}
