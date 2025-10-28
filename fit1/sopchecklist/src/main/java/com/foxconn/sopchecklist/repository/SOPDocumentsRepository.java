package com.foxconn.sopchecklist.repository;

import com.foxconn.sopchecklist.entity.SOPDocuments;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import java.util.List;

public interface SOPDocumentsRepository extends JpaRepository<SOPDocuments, Integer> {
    @Query("SELECT d FROM SOPDocuments d WHERE d.sop.id = :sopId")
    List<SOPDocuments> findBySopIdCustom(@Param("sopId") Long sopId);

    @Query("SELECT COUNT(d) FROM SOPDocuments d WHERE d.sop.id = :sopId")
    int countBySopId(@Param("sopId") Long sopId);

    boolean existsBySop_IdAndTitleIgnoreCase(Long sopId, String title);

    boolean existsBySop_IdAndTitleIgnoreCaseAndDocumentIDNot(Long sopId, String title, Integer excludeId);
}

