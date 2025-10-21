package com.foxconn.sopchecklist.repository;

import com.foxconn.sopchecklist.entity.ChecklistCronMail;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface ChecklistMailRepository extends JpaRepository<ChecklistCronMail, Long> {
}