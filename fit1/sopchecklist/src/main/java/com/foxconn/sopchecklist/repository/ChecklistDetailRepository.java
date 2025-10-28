package com.foxconn.sopchecklist.repository;

import com.foxconn.sopchecklist.entity.ChecklistDetail;
import com.foxconn.sopchecklist.entity.Checklists;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Repository
public interface ChecklistDetailRepository extends JpaRepository<ChecklistDetail, Long> {

    boolean existsByChecklistAndImplementerAndScheduledAt(Checklists checklist, String implementer, LocalDateTime scheduledAt);

    List<ChecklistDetail> findByChecklist(Checklists checklist);

    Optional<ChecklistDetail> findTopByChecklistOrderByScheduledAtDesc(Checklists checklist);
}