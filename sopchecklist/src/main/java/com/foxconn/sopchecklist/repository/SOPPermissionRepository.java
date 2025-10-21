package com.foxconn.sopchecklist.repository;

import com.foxconn.sopchecklist.entity.SOPPermission;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface SOPPermissionRepository extends JpaRepository<SOPPermission, Long> {
    List<SOPPermission> findByGroupIdIn(List<Long> groupIds);
    List<SOPPermission> findByUserId(Long userId);
}


