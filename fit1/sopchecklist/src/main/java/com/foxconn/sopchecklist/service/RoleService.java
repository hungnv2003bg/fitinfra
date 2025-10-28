package com.foxconn.sopchecklist.service;

import com.foxconn.sopchecklist.entity.Role;
import java.util.List;

public interface RoleService {
    Role findById(Long id);
    Role findByName(String name);
    Role save(Role role);
    Role update(Role role);
    void delete(Long id);
    List<Role> findAll();
    boolean existsByName(String name);
    long count();
}

