package com.foxconn.sopchecklist.repository;

import com.foxconn.sopchecklist.entity.SOPs;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

public interface SOPsRepository extends JpaRepository<SOPs, Long> {
    Page<SOPs> findByNameContainingIgnoreCase(String name, Pageable pageable);
    

    boolean existsByNameIgnoreCase(String name);
    

    boolean existsByNameIgnoreCaseAndIdNot(String name, Long id);
}

