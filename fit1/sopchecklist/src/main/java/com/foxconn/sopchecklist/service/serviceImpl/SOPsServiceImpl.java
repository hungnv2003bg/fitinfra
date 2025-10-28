package com.foxconn.sopchecklist.service.serviceImpl;

import com.foxconn.sopchecklist.entity.SOPs;
import com.foxconn.sopchecklist.repository.SOPsRepository;
import com.foxconn.sopchecklist.service.SOPsService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import java.util.List;

@Service
public class SOPsServiceImpl implements SOPsService {

    @Autowired
    private SOPsRepository sopsRepository;

    @Override
    public SOPs findById(Long id) {
        return sopsRepository.findById(id).orElse(null);
    }

    @Override
    public SOPs save(SOPs sop) {
        return sopsRepository.save(sop);
    }

    @Override
    public SOPs update(SOPs sop) {
        return sopsRepository.save(sop);
    }

    @Override
    public void delete(Long id) {

        SOPs sop = sopsRepository.findById(id).orElse(null);
        if (sop != null) {
            sopsRepository.delete(sop);
        }
    }

    @Override
    public List<SOPs> findAll() {
        return sopsRepository.findAll();
    }

    @Override
    public Page<SOPs> search(String q, Pageable pageable) {
        boolean hasQ = q != null && !q.isBlank();
        if (hasQ) {
            return sopsRepository.findByNameContainingIgnoreCase(q, pageable);
        }
        return sopsRepository.findAll(pageable);
    }

    @Override
    public Page<SOPs> list(Pageable pageable) {
        return sopsRepository.findAll(pageable);
    }

    @Override
    public boolean existsByName(String name) {
        return sopsRepository.existsByNameIgnoreCase(name);
    }

    @Override
    public boolean existsByNameAndIdNot(String name, Long id) {
        return sopsRepository.existsByNameIgnoreCaseAndIdNot(name, id);
    }

}

