package com.foxconn.sopchecklist.repository;

import com.foxconn.sopchecklist.entity.Improvements;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface ImprovementsRepository extends JpaRepository<Improvements, Integer> {
    Optional<Improvements> findFirstByChecklistDetailId(String checklistDetailId);
    Optional<Improvements> findFirstByChecklist_IdAndCategoryOrderByCreatedAtDesc(Long checklistId, String category);
}

