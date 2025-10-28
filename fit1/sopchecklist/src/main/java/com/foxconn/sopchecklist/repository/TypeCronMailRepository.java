package com.foxconn.sopchecklist.repository;

import com.foxconn.sopchecklist.entity.TypeCronMail;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface TypeCronMailRepository extends JpaRepository<TypeCronMail, Long> {
    
    TypeCronMail findByTypeName(String typeName);
    
    List<TypeCronMail> findByEnabledTrue();
}

