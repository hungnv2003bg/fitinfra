package com.foxconn.sopchecklist.service.serviceImpl;

import com.foxconn.sopchecklist.entity.SOPDocumentFiles;
import com.foxconn.sopchecklist.repository.SOPDocumentFilesRepository;
import com.foxconn.sopchecklist.service.SOPDocumentFilesService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
public class SOPDocumentFilesServiceImpl implements SOPDocumentFilesService {

    @Autowired
    private SOPDocumentFilesRepository repository;

    @Override
    public List<SOPDocumentFiles> findByDocumentId(Integer documentId) {
        return repository.findByDocumentDocumentID(documentId);
    }

    @Override
    public SOPDocumentFiles save(SOPDocumentFiles file) {
        return repository.save(file);
    }

    @Override
    @Transactional
    public void deleteByDocumentId(Integer documentId) {
        repository.deleteByDocumentDocumentID(documentId);
    }

    @Override
    public void delete(Long id) {
        repository.deleteById(id);
    }
}

