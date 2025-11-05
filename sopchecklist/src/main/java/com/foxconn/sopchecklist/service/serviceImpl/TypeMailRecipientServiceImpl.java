package com.foxconn.sopchecklist.service.serviceImpl;

import com.foxconn.sopchecklist.entity.TypeMailRecipient;
import com.foxconn.sopchecklist.repository.TypeMailRecipientRepository;
import com.foxconn.sopchecklist.service.TimeService;
import com.foxconn.sopchecklist.service.TypeMailRecipientService;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class TypeMailRecipientServiceImpl implements TypeMailRecipientService {

    private final TypeMailRecipientRepository repository;
    private final TimeService timeService;

    public TypeMailRecipientServiceImpl(TypeMailRecipientRepository repository, TimeService timeService) {
        this.repository = repository;
        this.timeService = timeService;
    }

    @Override
    public TypeMailRecipient add(TypeMailRecipient typeMailRecipient) {
        if (typeMailRecipient.getCreatedAt() == null) {
            typeMailRecipient.setCreatedAt(timeService.nowVietnam());
        }
        if (typeMailRecipient.getUpdatedAt() == null) {
            typeMailRecipient.setUpdatedAt(timeService.nowVietnam());
        }
        return repository.save(typeMailRecipient);
    }

    @Override
    public TypeMailRecipient update(Long id, TypeMailRecipient typeMailRecipient) {
        TypeMailRecipient existing = repository.findById(id).orElseThrow(() -> new IllegalArgumentException("TypeMailRecipient not found"));
        existing.setTypeName(typeMailRecipient.getTypeName());
        existing.setDescription(typeMailRecipient.getDescription());
        existing.setEnabled(typeMailRecipient.getEnabled());
        existing.setUpdatedAt(timeService.nowVietnam());
        return repository.save(existing);
    }

    @Override
    public void delete(Long id) {
        repository.deleteById(id);
    }

    @Override
    public List<TypeMailRecipient> listAll() {
        return repository.findAll();
    }

    @Override
    public List<TypeMailRecipient> listEnabled() {
        return repository.findByEnabledTrue();
    }

    @Override
    public TypeMailRecipient findByTypeName(String typeName) {
        return repository.findByTypeName(typeName).orElse(null);
    }

    @Override
    public TypeMailRecipient findByTypeNameAndEnabled(String typeName) {
        return repository.findByTypeNameAndEnabledTrue(typeName).orElse(null);
    }
}
