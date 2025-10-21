package com.foxconn.sopchecklist.controller;

import com.foxconn.sopchecklist.entity.LimitSize;
import com.foxconn.sopchecklist.service.LimitSizeService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.Optional;

@RestController
@RequestMapping("/api/limit-size")
@CrossOrigin(origins = "*")
public class LimitSizeController {

    @Autowired
    private LimitSizeService limitSizeService;

    /**
     * Lấy tất cả limit size settings
     */
    @GetMapping
    public ResponseEntity<List<LimitSize>> getAllLimitSizes() {
        try {
            List<LimitSize> limitSizes = limitSizeService.getAllLimitSizes();
            return ResponseEntity.ok(limitSizes);
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    /**
     * Lấy tất cả limit size settings đang active
     */
    @GetMapping("/active")
    public ResponseEntity<List<LimitSize>> getActiveLimitSizes() {
        try {
            List<LimitSize> limitSizes = limitSizeService.getActiveLimitSizes();
            return ResponseEntity.ok(limitSizes);
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    /**
     * Lấy limit size theo ID
     */
    @GetMapping("/{id}")
    public ResponseEntity<LimitSize> getLimitSizeById(@PathVariable Long id) {
        try {
            Optional<LimitSize> limitSize = limitSizeService.getLimitSizeById(id);
            return limitSize.map(ResponseEntity::ok)
                    .orElse(ResponseEntity.notFound().build());
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    /**
     * Lấy giới hạn kích thước file upload hiện tại
     */
    @GetMapping("/file-upload-limit")
    public ResponseEntity<Map<String, Object>> getFileUploadLimit() {
        try {
            Long limit = limitSizeService.getFileUploadLimit();
            return ResponseEntity.ok(Map.of(
                    "maxSizeMb", limit,
                    "maxSizeBytes", limit * 1024 * 1024
            ));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    /**
     * Tạo mới limit size setting
     */
    @PostMapping
    public ResponseEntity<?> createLimitSize(@RequestBody LimitSize limitSize) {
        try {
            LimitSize createdLimitSize = limitSizeService.createLimitSize(limitSize);
            return ResponseEntity.status(HttpStatus.CREATED).body(createdLimitSize);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("error", "Lỗi server: " + e.getMessage()));
        }
    }

    /**
     * Cập nhật limit size setting
     */
    @PutMapping("/{id}")
    public ResponseEntity<?> updateLimitSize(@PathVariable Long id, @RequestBody LimitSize limitSize) {
        try {
            LimitSize updatedLimitSize = limitSizeService.updateLimitSize(id, limitSize);
            return ResponseEntity.ok(updatedLimitSize);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("error", "Lỗi server: " + e.getMessage()));
        }
    }

    /**
     * Xóa limit size setting (soft delete)
     */
    @DeleteMapping("/{id}")
    public ResponseEntity<?> deleteLimitSize(@PathVariable Long id) {
        try {
            limitSizeService.deleteLimitSize(id);
            return ResponseEntity.ok(Map.of("message", "Xóa thành công"));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("error", "Lỗi server: " + e.getMessage()));
        }
    }

    /**
     * Xóa vĩnh viễn limit size setting
     */
    @DeleteMapping("/{id}/permanent")
    public ResponseEntity<?> permanentDeleteLimitSize(@PathVariable Long id) {
        try {
            limitSizeService.permanentDeleteLimitSize(id);
            return ResponseEntity.ok(Map.of("message", "Xóa vĩnh viễn thành công"));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("error", "Lỗi server: " + e.getMessage()));
        }
    }

    /**
     * Kích hoạt/tắt limit size setting
     */
    @PatchMapping("/{id}/toggle")
    public ResponseEntity<?> toggleLimitSizeStatus(@PathVariable Long id) {
        try {
            LimitSize limitSize = limitSizeService.toggleLimitSizeStatus(id);
            return ResponseEntity.ok(limitSize);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("error", "Lỗi server: " + e.getMessage()));
        }
    }

    /**
     * Kiểm tra kích thước file có vượt quá giới hạn không
     */
    @PostMapping("/check-file-size")
    public ResponseEntity<?> checkFileSize(@RequestBody Map<String, Object> request) {
        try {
            Long fileSizeInBytes = Long.valueOf(request.get("fileSizeInBytes").toString());
            String settingName = request.getOrDefault("settingName", "FILE_UPLOAD_LIMIT").toString();
            
            boolean isExceeded = limitSizeService.isFileSizeExceeded(fileSizeInBytes, settingName);
            
            return ResponseEntity.ok(Map.of(
                    "isExceeded", isExceeded,
                    "fileSizeInBytes", fileSizeInBytes,
                    "fileSizeInMB", String.format("%.2f", fileSizeInBytes / (1024.0 * 1024.0)),
                    "settingName", settingName
            ));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", "Dữ liệu không hợp lệ: " + e.getMessage()));
        }
    }

    /**
     * Khởi tạo setting mặc định cho file upload limit
     */
    @PostMapping("/init-default")
    public ResponseEntity<?> initDefaultSettings() {
        try {
            // Kiểm tra xem đã có setting mặc định chưa
            Optional<LimitSize> existingLimit = limitSizeService.getLimitSizeBySettingName("FILE_UPLOAD_LIMIT");
            if (existingLimit.isPresent()) {
                return ResponseEntity.ok(Map.of("message", "Setting mặc định đã tồn tại", "data", existingLimit.get()));
            }

            // Tạo setting mặc định
            LimitSize defaultLimit = new LimitSize();
            defaultLimit.setSettingName("FILE_UPLOAD_LIMIT");
            defaultLimit.setMaxSizeMb(10L);
            defaultLimit.setDescription("Giới hạn kích thước file upload mặc định");
            defaultLimit.setIsActive(true);
            defaultLimit.setCreatedBy(1L); // Admin user ID

            LimitSize createdLimit = limitSizeService.createLimitSize(defaultLimit);
            return ResponseEntity.ok(Map.of("message", "Khởi tạo setting mặc định thành công", "data", createdLimit));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("error", "Lỗi server: " + e.getMessage()));
        }
    }
}
