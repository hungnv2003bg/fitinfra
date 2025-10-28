package com.foxconn.sopchecklist.service;

import com.foxconn.sopchecklist.entity.SOPs;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import java.util.List;

public interface SOPsService {
    SOPs findById(Long id);
    SOPs save(SOPs sop);
    SOPs update(SOPs sop);
    void delete(Long id);
    List<SOPs> findAll();
    Page<SOPs> search(String q, Pageable pageable);
    Page<SOPs> list(Pageable pageable);
    

    boolean existsByName(String name);
    boolean existsByNameAndIdNot(String name, Long id);
}

