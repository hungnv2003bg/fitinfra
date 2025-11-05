package com.foxconn.sopchecklist.service.serviceImpl;

import com.foxconn.sopchecklist.entity.TypeCronMail;
import com.foxconn.sopchecklist.repository.TypeCronMailRepository;
import com.foxconn.sopchecklist.service.TimeService;
import com.foxconn.sopchecklist.service.TypeCronMailService;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class TypeCronMailServiceImpl implements TypeCronMailService {

    private final TypeCronMailRepository repository;
    private final TimeService timeService;

    public TypeCronMailServiceImpl(TypeCronMailRepository repository, TimeService timeService) {
        this.repository = repository;
        this.timeService = timeService;
    }

    @Override
    public List<TypeCronMail> listAll() {
        return repository.findAll();
    }

    @Override
    public List<TypeCronMail> listEnabled() {
        return repository.findByEnabledTrue();
    }

    @Override
    public TypeCronMail findByTypeName(String typeName) {
        return repository.findByTypeName(typeName);
    }

    @Override
    public TypeCronMail add(TypeCronMail typeCronMail) {
        if (typeCronMail.getCreatedAt() == null) {
            typeCronMail.setCreatedAt(timeService.nowVietnam());
        }
        if (typeCronMail.getUpdatedAt() == null) {
            typeCronMail.setUpdatedAt(timeService.nowVietnam());
        }
        return repository.save(typeCronMail);
    }

    @Override
    public TypeCronMail update(Long id, TypeCronMail typeCronMail) {
        TypeCronMail existing = repository.findById(id).orElseThrow(() -> new IllegalArgumentException("Not found"));
        existing.setTypeName(typeCronMail.getTypeName());
        existing.setDescription(typeCronMail.getDescription());
        existing.setEnabled(typeCronMail.getEnabled());
        existing.setUpdatedAt(timeService.nowVietnam());
        return repository.save(existing);
    }

    @Override
    public void delete(Long id) {
        repository.deleteById(id);
    }
}

