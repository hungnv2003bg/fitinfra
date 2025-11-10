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

    Optional<LimitSize> findBySettingName(String settingName);

    List<LimitSize> findByIsActiveTrue();

    Optional<LimitSize> findBySettingNameAndIsActiveTrue(String settingName);

    @Query("SELECT COUNT(l) > 0 FROM LimitSize l WHERE l.settingName = :settingName AND l.id != :id")
    boolean existsBySettingNameAndIdNot(@Param("settingName") String settingName, @Param("id") Long id);

    @Query("SELECT l FROM LimitSize l WHERE l.settingName = 'FILE_UPLOAD_LIMIT' AND l.isActive = true")
    Optional<LimitSize> findFileUploadLimit();
}
