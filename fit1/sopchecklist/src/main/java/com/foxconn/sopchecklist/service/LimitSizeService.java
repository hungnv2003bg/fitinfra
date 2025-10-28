package com.foxconn.sopchecklist.service;

import com.foxconn.sopchecklist.entity.LimitSize;
import com.foxconn.sopchecklist.repository.LimitSizeRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Service
@Transactional
public class LimitSizeService {

    @Autowired
    private LimitSizeRepository limitSizeRepository;

    /**
     * Lấy tất cả limit size settings
     */
    public List<LimitSize> getAllLimitSizes() {
        return limitSizeRepository.findAll();
    }

    /**
     * Lấy tất cả limit size settings đang active
     */
    public List<LimitSize> getActiveLimitSizes() {
        return limitSizeRepository.findByIsActiveTrue();
    }

    /**
     * Lấy limit size theo ID
     */
    public Optional<LimitSize> getLimitSizeById(Long id) {
        return limitSizeRepository.findById(id);
    }

    /**
     * Lấy limit size theo tên setting
     */
    public Optional<LimitSize> getLimitSizeBySettingName(String settingName) {
        return limitSizeRepository.findBySettingNameAndIsActiveTrue(settingName);
    }

    /**
     * Lấy giới hạn kích thước file upload (setting mặc định)
     */
    public Long getFileUploadLimit() {
        return limitSizeRepository.findFileUploadLimit()
                .map(LimitSize::getMaxSizeMb)
                .orElse(10L); // Default 10MB nếu không tìm thấy setting
    }

    /**
     * Tạo mới limit size setting
     */
    public LimitSize createLimitSize(LimitSize limitSize) {
        // Kiểm tra setting name đã tồn tại chưa
        if (limitSizeRepository.findBySettingName(limitSize.getSettingName()).isPresent()) {
            throw new IllegalArgumentException("Setting name đã tồn tại: " + limitSize.getSettingName());
        }

        limitSize.setCreatedAt(LocalDateTime.now());
        return limitSizeRepository.save(limitSize);
    }

    /**
     * Cập nhật limit size setting
     */
    public LimitSize updateLimitSize(Long id, LimitSize updatedLimitSize) {
        LimitSize existingLimitSize = limitSizeRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Không tìm thấy limit size với ID: " + id));

        // Kiểm tra setting name có bị trùng với setting khác không
        if (!existingLimitSize.getSettingName().equals(updatedLimitSize.getSettingName()) &&
            limitSizeRepository.existsBySettingNameAndIdNot(updatedLimitSize.getSettingName(), id)) {
            throw new IllegalArgumentException("Setting name đã tồn tại: " + updatedLimitSize.getSettingName());
        }

        existingLimitSize.setSettingName(updatedLimitSize.getSettingName());
        existingLimitSize.setMaxSizeMb(updatedLimitSize.getMaxSizeMb());
        existingLimitSize.setDescription(updatedLimitSize.getDescription());
        existingLimitSize.setIsActive(updatedLimitSize.getIsActive());
        existingLimitSize.setUpdatedAt(LocalDateTime.now());
        existingLimitSize.setUpdatedBy(updatedLimitSize.getUpdatedBy());

        return limitSizeRepository.save(existingLimitSize);
    }

    /**
     * Xóa limit size setting (soft delete)
     */
    public void deleteLimitSize(Long id) {
        LimitSize limitSize = limitSizeRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Không tìm thấy limit size với ID: " + id));

        limitSize.setIsActive(false);
        limitSize.setUpdatedAt(LocalDateTime.now());
        limitSizeRepository.save(limitSize);
    }

    /**
     * Xóa vĩnh viễn limit size setting
     */
    public void permanentDeleteLimitSize(Long id) {
        if (!limitSizeRepository.existsById(id)) {
            throw new IllegalArgumentException("Không tìm thấy limit size với ID: " + id);
        }
        limitSizeRepository.deleteById(id);
    }

    /**
     * Kích hoạt/tắt limit size setting
     */
    public LimitSize toggleLimitSizeStatus(Long id) {
        LimitSize limitSize = limitSizeRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Không tìm thấy limit size với ID: " + id));

        limitSize.setIsActive(!limitSize.getIsActive());
        limitSize.setUpdatedAt(LocalDateTime.now());
        return limitSizeRepository.save(limitSize);
    }

    /**
     * Kiểm tra kích thước file có vượt quá giới hạn không
     */
    public boolean isFileSizeExceeded(Long fileSizeInBytes, String settingName) {
        Optional<LimitSize> limitSizeOpt = getLimitSizeBySettingName(settingName);
        if (limitSizeOpt.isEmpty()) {
            return false; // Không có giới hạn thì cho phép
        }

        Long maxSizeBytes = limitSizeOpt.get().getMaxSizeMb() * 1024 * 1024; // Convert MB to bytes
        return fileSizeInBytes > maxSizeBytes;
    }

    /**
     * Kiểm tra kích thước file upload có vượt quá giới hạn không
     */
    public boolean isFileUploadSizeExceeded(Long fileSizeInBytes) {
        Long maxSizeBytes = getFileUploadLimit() * 1024 * 1024; // Convert MB to bytes
        return fileSizeInBytes > maxSizeBytes;
    }
}
