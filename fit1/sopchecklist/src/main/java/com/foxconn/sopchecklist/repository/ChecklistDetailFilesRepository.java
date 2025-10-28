package com.foxconn.sopchecklist.repository;

import com.foxconn.sopchecklist.entity.ChecklistDetailFiles;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface ChecklistDetailFilesRepository extends JpaRepository<ChecklistDetailFiles, Long> {
}
