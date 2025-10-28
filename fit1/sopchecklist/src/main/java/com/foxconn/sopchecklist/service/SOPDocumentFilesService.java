package com.foxconn.sopchecklist.service;

import com.foxconn.sopchecklist.entity.SOPDocumentFiles;
import java.util.List;

public interface SOPDocumentFilesService {
    List<SOPDocumentFiles> findByDocumentId(Integer documentId);
    SOPDocumentFiles save(SOPDocumentFiles file);
    void deleteByDocumentId(Integer documentId);
    void delete(Long id);
}

