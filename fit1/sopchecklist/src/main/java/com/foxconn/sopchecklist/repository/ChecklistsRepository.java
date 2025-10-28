package com.foxconn.sopchecklist.repository;

import com.foxconn.sopchecklist.entity.Checklists;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ChecklistsRepository extends JpaRepository<Checklists, Long> {
}

