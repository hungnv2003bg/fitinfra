package com.foxconn.sopchecklist.service.serviceImpl;

import com.foxconn.sopchecklist.entity.ChecklistDetailFiles;
import com.foxconn.sopchecklist.repository.ChecklistDetailFilesRepository;
import com.foxconn.sopchecklist.service.ChecklistDetailFilesService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

@Service
public class ChecklistDetailFilesServiceImpl implements ChecklistDetailFilesService {

    @Autowired
    private ChecklistDetailFilesRepository repository;

    @Override
    public ChecklistDetailFiles save(ChecklistDetailFiles file) {
        return repository.save(file);
    }

    @Override
    public void delete(Long id) {
        repository.deleteById(id);
    }
}
