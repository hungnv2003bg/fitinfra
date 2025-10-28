package com.foxconn.sopchecklist.service;

import com.foxconn.sopchecklist.entity.SOPDocuments;
import java.util.List;
import java.util.Map;

public interface SOPDocumentsService {
    SOPDocuments findById(Integer id);
    SOPDocuments save(SOPDocuments document);
    SOPDocuments update(SOPDocuments document);
    SOPDocuments updateWithFiles(SOPDocuments document, List<Map<String, Object>> filesData);
    void delete(Integer id);
    List<SOPDocuments> findAll();
}

