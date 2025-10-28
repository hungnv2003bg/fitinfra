package com.foxconn.sopchecklist.repository;

import com.foxconn.sopchecklist.entity.LimitSize;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface LimitSizeRepository extends JpaRepository<LimitSize, Long> {

    /**
     * Tìm limit size theo tên setting
     */
    Optional<LimitSize> findBySettingName(String settingName);

    /**
     * Tìm tất cả limit size đang active
     */
    List<LimitSize> findByIsActiveTrue();

    /**
     * Tìm limit size theo tên setting và đang active
     */
    Optional<LimitSize> findBySettingNameAndIsActiveTrue(String settingName);

    /**
     * Kiểm tra xem setting name đã tồn tại chưa (trừ id hiện tại)
     */
    @Query("SELECT COUNT(l) > 0 FROM LimitSize l WHERE l.settingName = :settingName AND l.id != :id")
    boolean existsBySettingNameAndIdNot(@Param("settingName") String settingName, @Param("id") Long id);

    /**
     * Tìm limit size cho file upload (setting name mặc định)
     */
    @Query("SELECT l FROM LimitSize l WHERE l.settingName = 'FILE_UPLOAD_LIMIT' AND l.isActive = true")
    Optional<LimitSize> findFileUploadLimit();
}
