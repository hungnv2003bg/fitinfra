package com.foxconn.sopchecklist.service;

import com.foxconn.sopchecklist.entity.TypeCronMail;

import java.util.List;

public interface TypeCronMailService {
    
    List<TypeCronMail> listAll();
    
    List<TypeCronMail> listEnabled();
    
    TypeCronMail findByTypeName(String typeName);
    
    TypeCronMail add(TypeCronMail typeCronMail);
    
    TypeCronMail update(Long id, TypeCronMail typeCronMail);
    
    void delete(Long id);
}

