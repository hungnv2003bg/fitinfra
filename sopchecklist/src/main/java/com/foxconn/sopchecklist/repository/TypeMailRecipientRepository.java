package com.foxconn.sopchecklist.repository;

import com.foxconn.sopchecklist.entity.TypeMailRecipient;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface TypeMailRecipientRepository extends JpaRepository<TypeMailRecipient, Long> {
    List<TypeMailRecipient> findByEnabledTrue();
    Optional<TypeMailRecipient> findByTypeNameAndEnabledTrue(String typeName);
    Optional<TypeMailRecipient> findByTypeName(String typeName);
}
