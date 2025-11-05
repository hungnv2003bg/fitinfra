package com.foxconn.sopchecklist.controller;

import com.foxconn.sopchecklist.entity.Users;
import com.foxconn.sopchecklist.entity.Role;
import com.foxconn.sopchecklist.service.UsersService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.Set;

@RestController
@RequestMapping("/api/users")
public class UsersController {

    @Autowired
    private UsersService usersService;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @GetMapping
    public List<Users> findAll(
            @RequestParam(value = "groupId", required = false) String groupId,
            @RequestParam(value = "group", required = false) String group
    ) {
        // Be tolerant to different param names/types to avoid 400 from type conversion
        Long gid = null;
        try {
            if (groupId != null && !groupId.isBlank()) {
                gid = Long.valueOf(groupId.trim());
            } else if (group != null && !group.isBlank()) {
                gid = Long.valueOf(group.trim());
            }
        } catch (NumberFormatException ignored) {
            gid = null; // If cannot parse, fall back to all users
        }

        if (gid != null) {
            return usersService.findByGroupId(gid);
        }
        return usersService.findAll();
    }

    @GetMapping("/{id}")
    public ResponseEntity<Users> findById(@PathVariable Integer id) {
        Users user = usersService.findById(id);
        if (user != null) {
            return ResponseEntity.ok(user);
        }
        return ResponseEntity.notFound().build();
    }

    @PostMapping("/{userId}/roles")
    public ResponseEntity<Users> assignRoles(@PathVariable Integer userId, @RequestBody Set<Role> roles) {
        Users user = usersService.assignRoles(userId, roles);
        if (user != null) {
            return ResponseEntity.ok(user);
        }
        return ResponseEntity.notFound().build();
    }

    @DeleteMapping("/{userId}/roles/{roleId}")
    public ResponseEntity<Users> removeRole(@PathVariable Integer userId, @PathVariable Long roleId) {
        Users user = usersService.removeRole(userId, roleId);
        if (user != null) {
            return ResponseEntity.ok(user);
        }
        return ResponseEntity.notFound().build();
    }

    @PostMapping
    public ResponseEntity<?> createUser(@RequestBody Users user) {
        try {

            if (usersService.existsByManv(user.getManv())) {
                return ResponseEntity.badRequest()
                    .body(Map.of("error", "DUPLICATE_MANV", "duplicateValue", user.getManv()));
            }
            

            if (usersService.existsByEmail(user.getEmail())) {
                return ResponseEntity.badRequest()
                    .body(Map.of("error", "DUPLICATE_EMAIL", "duplicateValue", user.getEmail()));
            }
            

            // No duplicate check on phone number per new requirement
            

            if (user.getPasswordHash() != null && !user.getPasswordHash().isEmpty()) {
                user.setPasswordHash(passwordEncoder.encode(user.getPasswordHash()));
            }

            Users savedUser = usersService.save(user);
            return ResponseEntity.ok(savedUser);
        } catch (Exception e) {
            return ResponseEntity.badRequest()
                .body(Map.of("error", "Có lỗi xảy ra khi tạo user: " + e.getMessage()));
        }
    }

    @PutMapping("/{id}")
    public ResponseEntity<?> updateUser(@PathVariable Integer id, @RequestBody Users user) {
        try {
            Users existingUser = usersService.findById(id);
            if (existingUser == null) {
                return ResponseEntity.notFound().build();
            }
            

            if (!existingUser.getManv().equals(user.getManv()) && 
                usersService.existsByManvAndIdNot(user.getManv(), id)) {
                return ResponseEntity.badRequest()
                    .body(Map.of("error", "DUPLICATE_MANV", "duplicateValue", user.getManv()));
            }
            

            if (!existingUser.getEmail().equals(user.getEmail()) && 
                usersService.existsByEmailAndIdNot(user.getEmail(), id)) {
                return ResponseEntity.badRequest()
                    .body(Map.of("error", "DUPLICATE_EMAIL", "duplicateValue", user.getEmail()));
            }
            

            // No duplicate check on phone number when updating
            

            existingUser.setFullName(user.getFullName());
            existingUser.setEmail(user.getEmail());
            existingUser.setManv(user.getManv());
            existingUser.setPhone(user.getPhone());
            existingUser.setStatus(user.getStatus());
            

            if (user.getGroups() != null) {
                existingUser.setGroups(user.getGroups());
            }

            Users updatedUser = usersService.update(existingUser);
            return ResponseEntity.ok(updatedUser);
        } catch (Exception e) {
            return ResponseEntity.badRequest()
                .body(Map.of("error", "Có lỗi xảy ra khi cập nhật user: " + e.getMessage()));
        }
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteUser(@PathVariable Integer id) {
        try {
            usersService.delete(id);
            return ResponseEntity.ok().build();
        } catch (Exception e) {
            return ResponseEntity.badRequest().build();
        }
    }

    @PutMapping("/{id}/password")
    public ResponseEntity<?> updatePassword(@PathVariable Integer id, @RequestBody Map<String, String> body) {
        try {
            Users existingUser = usersService.findById(id);
            if (existingUser == null) {
                return ResponseEntity.notFound().build();
            }
            
            String currentPassword = body.get("currentPassword");
            String newPassword = body.get("newPassword");
            

            if (currentPassword == null || !passwordEncoder.matches(currentPassword, existingUser.getPasswordHash())) {
                return ResponseEntity.badRequest().body(Map.of("error", "Mật khẩu hiện tại không đúng"));
            }
            

            if (newPassword == null || newPassword.trim().length() < 6) {
                return ResponseEntity.badRequest().body(Map.of("error", "Mật khẩu mới phải có ít nhất 6 ký tự"));
            }
            

            if (passwordEncoder.matches(newPassword, existingUser.getPasswordHash())) {
                return ResponseEntity.badRequest().body(Map.of("error", "Mật khẩu mới phải khác mật khẩu hiện tại"));
            }
            
            existingUser.setPasswordHash(passwordEncoder.encode(newPassword));
            usersService.update(existingUser);
            
            return ResponseEntity.ok(Map.of("message", "Đổi mật khẩu thành công"));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", "Không thể đổi mật khẩu: " + e.getMessage()));
        }
    }

    @PutMapping("/{id}/password/reset")
    public ResponseEntity<?> adminResetPassword(@PathVariable Integer id, @RequestBody Map<String, String> body) {
        try {
            Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
            Object principal = authentication != null ? authentication.getPrincipal() : null;

            // Allow only ADMIN to reset password without current password
            boolean isAdmin = false;
            try {
                com.foxconn.sopchecklist.config.UserPrincipal me = (com.foxconn.sopchecklist.config.UserPrincipal) principal;
                if (me != null) {
                    Users actingUser = usersService.findByManv(me.getUsername());
                    isAdmin = actingUser != null && actingUser.getRoles() != null && actingUser.getRoles().stream().anyMatch(r ->
                            "ADMIN".equalsIgnoreCase(r.getName()));
                }
            } catch (ClassCastException ignored) {
                isAdmin = false;
            }

            if (!isAdmin) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of("error", "Access denied"));
            }

            Users targetUser = usersService.findById(id);
            if (targetUser == null) {
                return ResponseEntity.notFound().build();
            }

            String newPassword = body.get("newPassword");
            if (newPassword == null || newPassword.trim().length() < 6) {
                return ResponseEntity.badRequest().body(Map.of("error", "Mật khẩu mới phải có ít nhất 6 ký tự"));
            }

            targetUser.setPasswordHash(passwordEncoder.encode(newPassword));
            usersService.update(targetUser);
            return ResponseEntity.ok(Map.of("message", "Đặt lại mật khẩu thành công"));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", "Không thể đặt lại mật khẩu: " + e.getMessage()));
        }
    }
}



