package com.foxconn.sopchecklist.repository;

import com.foxconn.sopchecklist.entity.ChecklistDetail;
import com.foxconn.sopchecklist.entity.Checklists;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Repository
public interface ChecklistDetailRepository extends JpaRepository<ChecklistDetail, Long> {

    boolean existsByChecklistAndImplementerAndScheduledAt(Checklists checklist, String implementer, LocalDateTime scheduledAt);

    List<ChecklistDetail> findByChecklist(Checklists checklist);

    // Default order newest first
    List<ChecklistDetail> findByChecklistOrderByCreatedAtDesc(Checklists checklist);

    // Filtering by status
    List<ChecklistDetail> findByChecklistAndStatusOrderByCreatedAtDesc(Checklists checklist, String status);

    // Filtering by implementer string (e.g., "group:5")
    List<ChecklistDetail> findByChecklistAndImplementerOrderByCreatedAtDesc(Checklists checklist, String implementer);

    // Filtering by both
    List<ChecklistDetail> findByChecklistAndStatusAndImplementerOrderByCreatedAtDesc(Checklists checklist, String status, String implementer);

    // Text search (taskName or workContent contains q)
    @Query("SELECT c FROM ChecklistDetail c WHERE c.checklist = :checklist AND (LOWER(c.taskName) LIKE LOWER(CONCAT('%', :q, '%')) OR LOWER(c.workContent) LIKE LOWER(CONCAT('%', :q, '%'))) ORDER BY c.createdAt DESC")
    List<ChecklistDetail> searchByChecklistAndQOrderByCreatedAtDesc(@Param("checklist") Checklists checklist, @Param("q") String q);

    @Query("SELECT c FROM ChecklistDetail c WHERE c.checklist = :checklist AND c.status = :status AND (LOWER(c.taskName) LIKE LOWER(CONCAT('%', :q, '%')) OR LOWER(c.workContent) LIKE LOWER(CONCAT('%', :q, '%'))) ORDER BY c.createdAt DESC")
    List<ChecklistDetail> searchByChecklistAndStatusAndQOrderByCreatedAtDesc(@Param("checklist") Checklists checklist, @Param("status") String status, @Param("q") String q);

    @Query("SELECT c FROM ChecklistDetail c WHERE c.checklist = :checklist AND c.implementer = :implementer AND (LOWER(c.taskName) LIKE LOWER(CONCAT('%', :q, '%')) OR LOWER(c.workContent) LIKE LOWER(CONCAT('%', :q, '%'))) ORDER BY c.createdAt DESC")
    List<ChecklistDetail> searchByChecklistAndImplementerAndQOrderByCreatedAtDesc(@Param("checklist") Checklists checklist, @Param("implementer") String implementer, @Param("q") String q);

    @Query("SELECT c FROM ChecklistDetail c WHERE c.checklist = :checklist AND c.status = :status AND c.implementer = :implementer AND (LOWER(c.taskName) LIKE LOWER(CONCAT('%', :q, '%')) OR LOWER(c.workContent) LIKE LOWER(CONCAT('%', :q, '%'))) ORDER BY c.createdAt DESC")
    List<ChecklistDetail> searchByChecklistAndStatusAndImplementerAndQOrderByCreatedAtDesc(@Param("checklist") Checklists checklist, @Param("status") String status, @Param("implementer") String implementer, @Param("q") String q);

    Optional<ChecklistDetail> findTopByChecklistOrderByScheduledAtDesc(Checklists checklist);

    // Find checklist details that have reached deadline but are not completed
    @Query("SELECT c FROM ChecklistDetail c WHERE c.deadlineAt IS NOT NULL AND c.deadlineAt <= :now AND c.status NOT IN ('COMPLETED', 'DONE')")
    List<ChecklistDetail> findByDeadlineAtBeforeOrEqualAndStatusNotCompleted(@Param("now") LocalDateTime now);
}