package com.foxconn.sopchecklist.repository;

import com.foxconn.sopchecklist.entity.ChecklistPermission;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ChecklistPermissionRepository extends JpaRepository<ChecklistPermission, Long> {
    List<ChecklistPermission> findByGroupIdIn(List<Long> groupIds);
    List<ChecklistPermission> findByUserId(Long userId);
}


