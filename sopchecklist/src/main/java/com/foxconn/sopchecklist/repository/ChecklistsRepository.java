package com.foxconn.sopchecklist.repository;

import com.foxconn.sopchecklist.entity.Checklists;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface ChecklistsRepository extends JpaRepository<Checklists, Long> {

    /**
     * Find checklists whose implementers include the given group directly (group:ID)
     * or any users that belong to that group (user:USER_ID).
     */
    @Query(value = "\n" +
            "SELECT DISTINCT c.*\n" +
            "FROM Checklists c\n" +
            "JOIN Checklist_Implementers ci ON ci.checklist_id = c.id\n" +
            "LEFT JOIN user_groups ug ON CONCAT('user:', ug.user_id) = ci.implementer\n" +
            "WHERE ci.implementer = CONCAT('group:', :groupId)\n" +
            "   OR ug.group_id = :groupId\n",
            nativeQuery = true)
    List<Checklists> findByGroupOrUsersInGroup(@Param("groupId") Long groupId);
}

