package com.foxconn.sopchecklist.repository;

import com.foxconn.sopchecklist.entity.TimeRepeatChecklist;
import org.springframework.data.jpa.repository.JpaRepository;

public interface TimeRepeatChecklistRepository extends JpaRepository<TimeRepeatChecklist, Long> {
}


