package com.foxconn.sopchecklist.repository;

import com.foxconn.sopchecklist.entity.SOPDocumentFiles;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface SOPDocumentFilesRepository extends JpaRepository<SOPDocumentFiles, Long> {
    
    List<SOPDocumentFiles> findByDocumentDocumentID(Integer documentId);
    
    void deleteByDocumentDocumentID(Integer documentId);
}

