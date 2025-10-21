package com.foxconn.sopchecklist.service;

import com.foxconn.sopchecklist.entity.Role;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.CommandLineRunner;
import org.springframework.stereotype.Service;

@Service
public class DataInitializationService implements CommandLineRunner {

    @Autowired
    private RoleService roleService;

    @Override
    public void run(String... args) throws Exception {
        initializeRoles();
    }

    private void initializeRoles() {

        if (!roleService.existsByName("ADMIN")) {
            Role adminRole = new Role("ADMIN", "Administrator role with full access");
            roleService.save(adminRole);
        }


        if (!roleService.existsByName("MANAGER")) {
            Role managerRole = new Role("MANAGER", "Manager role with management access");
            roleService.save(managerRole);
        }


        if (!roleService.existsByName("USER")) {
            Role userRole = new Role("USER", "User role with basic access");
            roleService.save(userRole);
        }
    }
}

