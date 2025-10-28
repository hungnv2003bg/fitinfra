package com.foxconn.sopchecklist.repository;

import com.foxconn.sopchecklist.entity.SOPDocumentPermission;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface SOPDocumentPermissionRepository extends JpaRepository<SOPDocumentPermission, Long> {
    List<SOPDocumentPermission> findBySopId(Long sopId);
    List<SOPDocumentPermission> findByDocumentId(Integer documentId);
    List<SOPDocumentPermission> findBySopIdAndGroupIdIn(Long sopId, List<Long> groupIds);
    List<SOPDocumentPermission> findByDocumentIdAndGroupIdIn(Integer documentId, List<Long> groupIds);
    List<SOPDocumentPermission> findBySopIdAndUserId(Long sopId, Long userId);
    List<SOPDocumentPermission> findByDocumentIdAndUserId(Integer documentId, Long userId);
    List<SOPDocumentPermission> findByUserId(Long userId);
}