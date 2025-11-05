package com.foxconn.sopchecklist.repository;

import com.foxconn.sopchecklist.entity.ImprovementProgress;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface ImprovementProgressRepository extends JpaRepository<ImprovementProgress, Long> {
    List<ImprovementProgress> findByImprovement_ImprovementIDOrderByCreatedAtDesc(Integer improvementId);
}


