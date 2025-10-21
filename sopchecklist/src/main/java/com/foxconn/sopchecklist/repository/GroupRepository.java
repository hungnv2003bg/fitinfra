package com.foxconn.sopchecklist.repository;

import com.foxconn.sopchecklist.entity.Group;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface GroupRepository extends JpaRepository<Group, Long> {
    boolean existsByNameIgnoreCase(String name);
    Optional<Group> findByNameIgnoreCase(String name);
}



