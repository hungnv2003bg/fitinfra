package com.foxconn.sopchecklist.controller;

import com.foxconn.sopchecklist.entity.Role;
import com.foxconn.sopchecklist.service.RoleService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.util.List;

@RestController
@RequestMapping("/api/roles")
public class RoleController {

    private static final Logger logger = LoggerFactory.getLogger(RoleController.class);

    @Autowired
    private RoleService roleService;

    @GetMapping("/test")
    public ResponseEntity<String> testEndpoint() {
        return ResponseEntity.ok("Role controller is working!");
    }

    @GetMapping("/db-test")
    public ResponseEntity<String> testDatabase() {
        try {
            logger.info("Testing database connection...");
            long count = roleService.count();
            logger.info("Database connection successful. Total roles: {}", count);
            return ResponseEntity.ok("Database OK - Total roles: " + count);
        } catch (Exception e) {
            logger.error("Database connection failed: ", e);
            return ResponseEntity.status(500).body("Database Error: " + e.getMessage());
        }
    }

    @GetMapping
    public ResponseEntity<List<Role>> getAllRoles() {
        try {
            logger.info("Getting all roles...");
            List<Role> roles = roleService.findAll();
            logger.info("Found {} roles", roles.size());
            return ResponseEntity.ok(roles);
        } catch (Exception e) {
            logger.error("Error getting all roles: ", e);
            e.printStackTrace();
            return ResponseEntity.status(500).build();
        }
    }

    @GetMapping("/{id}")
    public ResponseEntity<Role> getRoleById(@PathVariable Long id) {
        Role role = roleService.findById(id);
        if (role != null) {
            return ResponseEntity.ok(role);
        }
        return ResponseEntity.notFound().build();
    }

    @GetMapping("/name/{name}")
    public ResponseEntity<Role> getRoleByName(@PathVariable String name) {
        Role role = roleService.findByName(name);
        if (role != null) {
            return ResponseEntity.ok(role);
        }
        return ResponseEntity.notFound().build();
    }

    @PostMapping
    public ResponseEntity<Role> createRole(@RequestBody Role role) {
        if (roleService.existsByName(role.getName())) {
            return ResponseEntity.badRequest().build();
        }
        Role savedRole = roleService.save(role);
        return ResponseEntity.ok(savedRole);
    }

    @PutMapping("/{id}")
    public ResponseEntity<Role> updateRole(@PathVariable Long id, @RequestBody Role role) {
        Role existingRole = roleService.findById(id);
        if (existingRole == null) {
            return ResponseEntity.notFound().build();
        }
        
        if (!existingRole.getName().equals(role.getName()) && roleService.existsByName(role.getName())) {
            return ResponseEntity.badRequest().build();
        }
        
        role.setId(id);
        Role updatedRole = roleService.update(role);
        return ResponseEntity.ok(updatedRole);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteRole(@PathVariable Long id) {
        Role role = roleService.findById(id);
        if (role == null) {
            return ResponseEntity.notFound().build();
        }
        roleService.delete(id);
        return ResponseEntity.ok().build();
    }
}

