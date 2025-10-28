package com.foxconn.sopchecklist.repository;

import com.foxconn.sopchecklist.entity.MailRecipientAll;
import com.foxconn.sopchecklist.entity.TypeMailRecipient;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface MailRecipientAllRepository extends JpaRepository<MailRecipientAll, Long> {
    List<MailRecipientAll> findByEnabledTrue();
    
    // Tìm theo type (TO, CC, BCC) và enabled
    List<MailRecipientAll> findByTypeAndEnabledTrue(String type);
    
    // Tìm theo type_mail_recipient và enabled
    List<MailRecipientAll> findByTypeMailRecipientAndEnabledTrue(TypeMailRecipient typeMailRecipient);
    
    @Query("SELECT m FROM MailRecipientAll m JOIN m.typeMailRecipient t WHERE t.typeName = :typeName AND m.enabled = true")
    List<MailRecipientAll> findByTypeMailRecipientTypeNameAndEnabledTrue(@Param("typeName") String typeName);
    
    // Tìm theo cả type và type_mail_recipient
    List<MailRecipientAll> findByTypeAndTypeMailRecipientAndEnabledTrue(String type, TypeMailRecipient typeMailRecipient);
    List<MailRecipientAll> findByTypeAndTypeMailRecipientTypeNameAndEnabledTrue(String type, String typeName);
    
    // Tìm theo checklist_id
    List<MailRecipientAll> findByChecklistIdAndEnabledTrue(Long checklistId);
    
    // Tìm theo checklist_id và type
    List<MailRecipientAll> findByChecklistIdAndTypeAndEnabledTrue(Long checklistId, String type);
    
    // Tìm theo checklist_id và type_mail_recipient
    List<MailRecipientAll> findByChecklistIdAndTypeMailRecipientAndEnabledTrue(Long checklistId, TypeMailRecipient typeMailRecipient);
    
    // Tìm theo checklist_id, type và type_mail_recipient
    List<MailRecipientAll> findByChecklistIdAndTypeAndTypeMailRecipientAndEnabledTrue(Long checklistId, String type, TypeMailRecipient typeMailRecipient);
    
    @Query("SELECT m FROM MailRecipientAll m JOIN m.typeMailRecipient t WHERE m.checklistId = :checklistId AND t.typeName = :typeName AND m.enabled = true")
    List<MailRecipientAll> findByChecklistIdAndTypeMailRecipientTypeNameAndEnabledTrue(@Param("checklistId") Long checklistId, @Param("typeName") String typeName);
    
    @Query("SELECT m FROM MailRecipientAll m JOIN m.typeMailRecipient t WHERE m.checklistId = :checklistId AND m.type = :type AND t.typeName = :typeName AND m.enabled = true")
    List<MailRecipientAll> findByChecklistIdAndTypeAndTypeMailRecipientTypeNameAndEnabledTrue(@Param("checklistId") Long checklistId, @Param("type") String type, @Param("typeName") String typeName);
}
