package com.foxconn.sopchecklist.service;

import com.foxconn.sopchecklist.entity.ChecklistDetailFiles;

public interface ChecklistDetailFilesService {
    ChecklistDetailFiles save(ChecklistDetailFiles file);
    void delete(Long id);
}
