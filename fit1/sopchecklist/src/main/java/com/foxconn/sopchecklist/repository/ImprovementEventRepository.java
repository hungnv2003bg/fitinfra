package com.foxconn.sopchecklist.repository;

import com.foxconn.sopchecklist.entity.ImprovementEvent;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface ImprovementEventRepository extends JpaRepository<ImprovementEvent, Long> {
}
