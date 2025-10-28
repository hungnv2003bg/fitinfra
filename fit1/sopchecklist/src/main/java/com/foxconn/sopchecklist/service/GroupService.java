package com.foxconn.sopchecklist.service;

import com.foxconn.sopchecklist.entity.Group;
import com.foxconn.sopchecklist.repository.GroupRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
public class GroupService {

    private final GroupRepository repository;

    public GroupService(GroupRepository repository) {
        this.repository = repository;
    }

    public List<Group> findAll() {
        return repository.findAll();
    }

    public Group findById(Long id) {
        return repository.findById(id).orElse(null);
    }

    @Transactional
    public Group create(Group body) {
        validate(body);
        if (repository.existsByNameIgnoreCase(body.getName())) {
            throw new DuplicateNameException(body.getName());
        }
        body.setId(null);
        return repository.save(body);
    }

    @Transactional
    public Group update(Long id, Group body) {
        validate(body);
        Group current = repository.findById(id).orElse(null);
        if (current == null) return null;
        if (!current.getName().equalsIgnoreCase(body.getName()) && repository.existsByNameIgnoreCase(body.getName())) {
            throw new DuplicateNameException(body.getName());
        }
        current.setName(body.getName());
        current.setDescription(body.getDescription());
        return repository.save(current);
    }

    public void delete(Long id) {
        repository.deleteById(id);
    }

    private void validate(Group body) {
        if (body == null || body.getName() == null || body.getName().trim().length() < 2) {
            throw new IllegalArgumentException("Group name must have at least 2 characters");
        }
    }

    public static class DuplicateNameException extends RuntimeException {
        private final String duplicateValue;
        public DuplicateNameException(String duplicateValue) {
            super("Duplicate group name: " + duplicateValue);
            this.duplicateValue = duplicateValue;
        }
        public String getDuplicateValue() { return duplicateValue; }
    }
}



