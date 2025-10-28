package com.foxconn.sopchecklist.service;

import com.foxconn.sopchecklist.entity.TypeMailRecipient;

import java.util.List;

public interface TypeMailRecipientService {
    TypeMailRecipient add(TypeMailRecipient typeMailRecipient);
    TypeMailRecipient update(Long id, TypeMailRecipient typeMailRecipient);
    void delete(Long id);
    List<TypeMailRecipient> listAll();
    List<TypeMailRecipient> listEnabled();
    TypeMailRecipient findByTypeName(String typeName);
    TypeMailRecipient findByTypeNameAndEnabled(String typeName);
}
