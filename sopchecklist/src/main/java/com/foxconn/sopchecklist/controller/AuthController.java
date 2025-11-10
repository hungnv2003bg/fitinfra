package com.foxconn.sopchecklist.controller;

import com.foxconn.sopchecklist.config.JwtTokenProvider;
import com.foxconn.sopchecklist.config.LoginRequest;
import com.foxconn.sopchecklist.config.RegisterRequest;
import com.foxconn.sopchecklist.config.UserData;
import com.foxconn.sopchecklist.config.UserPrincipal;
import com.foxconn.sopchecklist.entity.Users;
import com.foxconn.sopchecklist.entity.Role;
import com.foxconn.sopchecklist.entity.UserStatus;
import com.foxconn.sopchecklist.service.UsersService;
import com.foxconn.sopchecklist.service.RoleService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.http.HttpStatus;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;
import org.springframework.beans.factory.annotation.Value;

import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.HashSet;
import java.util.stream.Collectors;
import com.foxconn.sopchecklist.entity.Group;
import com.foxconn.sopchecklist.entity.RefreshToken;
import com.foxconn.sopchecklist.service.RefreshTokenService;
import com.foxconn.sopchecklist.service.CronMailAllSendService;

@RestController
@RequestMapping("/api/auth")
public class AuthController {
    
    @Autowired
    private UsersService usersService;
    
    @Autowired
    private JwtTokenProvider jwtTokenProvider;
    
    @Autowired
    private AuthenticationManager authenticationManager;
    
    @Autowired
    private PasswordEncoder passwordEncoder;
    
    @Autowired
    private RefreshTokenService refreshTokenService;
    
    @Autowired
    private RoleService roleService;
    
    @Autowired
    private CronMailAllSendService cronMailAllSendService;
    
    @Value("${app.public.url}")
    private String appPublicUrl;

    @PostMapping("/dangnhap")
    public ResponseEntity<?> dangNhap(@RequestBody LoginRequest login) throws Exception {
        try {
            Users user = usersService.findByManv(login.getManv());
            
            if (user == null) {
                user = usersService.findByEmail(login.getManv());
            }
            
            if (user == null) {
                return ResponseEntity.badRequest().body("Tên đăng nhập không tồn tại");
            }

            if (user.getStatus() == UserStatus.INACTIVE) {
                return ResponseEntity.badRequest().body("Tài khoản chưa kích hoạt");
            }

            Authentication auth = authenticationManager.authenticate(
                new UsernamePasswordAuthenticationToken(user.getManv(), login.getPassword())
            );
            
            SecurityContextHolder.getContext().setAuthentication(auth);
            UserPrincipal userPrincipal = (UserPrincipal) auth.getPrincipal();
            
            String jwt = jwtTokenProvider.taoToken(userPrincipal);
            
            RefreshToken refreshToken = refreshTokenService.createRefreshToken(user);
            
            List<String> roles = userPrincipal.getAuthorities().stream()
                .map(authority -> authority.getAuthority())
                .collect(Collectors.toList());
            
            UserData response = new UserData(user, jwt, roles, refreshToken.getToken());
            
            return ResponseEntity.ok(response);
            
        } catch (Exception e) {
            return ResponseEntity.badRequest().body("Tên đăng nhập hoặc mật khẩu không đúng");
        }
    }

    @PostMapping("/dangky")
    public ResponseEntity<?> dangKy(@RequestBody RegisterRequest request) {
        try {
            if (usersService.findByManv(request.getManv()) != null) {
                return ResponseEntity.badRequest().body("Mã nhân viên đã được sử dụng");
            }
            
            if (usersService.findByEmail(request.getEmail()) != null) {
                return ResponseEntity.badRequest().body("Email đã được sử dụng");
            }
            

            Role role = roleService.findByName("USER");
            if (role == null) {
                return ResponseEntity.badRequest().body("Role USER không tồn tại trong hệ thống");
            }
            
            Users newUser = new Users();
            newUser.setFullName(request.getFullName());
            newUser.setEmail(request.getEmail());
            newUser.setManv(request.getManv());
            newUser.setPhone(request.getPhone());
            newUser.setPasswordHash(passwordEncoder.encode(request.getPassword()));
            newUser.setStatus(UserStatus.INACTIVE);
            
            Set<Role> roles = new HashSet<>();
            roles.add(role);
            newUser.setRoles(roles);
            

            if (request.getGroupIds() != null && !request.getGroupIds().isEmpty()) {
                java.util.Set<Group> groups = new java.util.HashSet<>();
                for (Long gid : request.getGroupIds()) {
                    Group g = new Group();
                    g.setId(gid);
                    groups.add(g);
                }
                newUser.setGroups(groups);
            }

            Users savedUser = usersService.save(newUser);
            
            try {
                String subject = "Thông báo đăng ký tài khoản mới - " + savedUser.getFullName();
                StringBuilder body = new StringBuilder();
                body.append("<div style=\"font-family:Arial,sans-serif;max-width:600px;margin:0 auto;\">");
                body.append("<h2 style=\"color:#333;\">Thông báo đăng ký tài khoản mới</h2>");
                body.append("<p>Hệ thống nhận được yêu cầu đăng ký tài khoản mới với thông tin sau:</p>");
                body.append("<table style=\"width:100%;border-collapse:collapse;margin:16px 0;\">");
                body.append("<tr><td style=\"border:1px solid #ddd;padding:8px;background:#f5f5f5;\">Họ và tên</td><td style=\"border:1px solid #ddd;padding:8px;\">").append(escapeHtml(savedUser.getFullName())).append("</td></tr>");
                body.append("<tr><td style=\"border:1px solid #ddd;padding:8px;background:#f5f5f5;\">Mã nhân viên</td><td style=\"border:1px solid #ddd;padding:8px;\">").append(escapeHtml(savedUser.getManv())).append("</td></tr>");
                body.append("<tr><td style=\"border:1px solid #ddd;padding:8px;background:#f5f5f5;\">Email</td><td style=\"border:1px solid #ddd;padding:8px;\">").append(escapeHtml(savedUser.getEmail())).append("</td></tr>");
                if (savedUser.getPhone() != null && !savedUser.getPhone().trim().isEmpty()) {
                    body.append("<tr><td style=\"border:1px solid #ddd;padding:8px;background:#f5f5f5;\">Số điện thoại</td><td style=\"border:1px solid #ddd;padding:8px;\">").append(escapeHtml(savedUser.getPhone())).append("</td></tr>");
                }
                body.append("<tr><td style=\"border:1px solid #ddd;padding:8px;background:#f5f5f5;\">Trạng thái</td><td style=\"border:1px solid #ddd;padding:8px;\">").append(savedUser.getStatus() == UserStatus.INACTIVE ? "Chờ kích hoạt" : "Đã kích hoạt").append("</td></tr>");
                body.append("</table>");
                
                try {
                    Long userId = savedUser.getUserID() != null ? savedUser.getUserID().longValue() : null;
                    if (userId != null) {
                        String link = appPublicUrl + "/account?userId=" + userId;
                        body.append("<p style=\"margin-top:12px;\"><a href=\"")
                                .append(link)
                                .append("\" style=\"display:inline-block;background:#1890ff;color:#fff;padding:8px 12px;border-radius:4px;text-decoration:none;\">Xem chi tiết tài khoản</a></p>");
                    }
                } catch (Exception ignore) {}
                
                body.append("<p><strong>Trân trọng,</strong></p>");
                body.append("<p><em>Hệ thống IT Management</em></p>");
                body.append("</div>");
                
                cronMailAllSendService.sendSignupMail(subject, body.toString(), savedUser.getUserID() != null ? savedUser.getUserID().longValue() : null);
            } catch (Exception emailException) {
                System.err.println("Error sending signup email: " + emailException.getMessage());
            }
            
            return ResponseEntity.ok(savedUser);
            
        } catch (Exception e) {
            return ResponseEntity.badRequest().body("Không thể tạo tài khoản: " + e.getMessage());
        }
    }
    
    private String escapeHtml(String input) {
        if (input == null) return "";
        return input.replace("&", "&amp;")
                   .replace("<", "&lt;")
                   .replace(">", "&gt;")
                   .replace("\"", "&quot;")
                   .replace("'", "&#39;");
    }

    @GetMapping("/me")
    public ResponseEntity<?> me() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();

        if (authentication == null || !(authentication.getPrincipal() instanceof UserPrincipal)) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body("Unauthorized");
        }

        UserPrincipal userPrincipal = (UserPrincipal) authentication.getPrincipal();
        Users user = usersService.findByManv(userPrincipal.getUsername());
        if (user == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body("Unauthorized");
        }
        if (user.getStatus() != UserStatus.ACTIVE) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body("Inactive user");
        }

        List<String> roles = userPrincipal.getAuthorities().stream()
            .map(authority -> authority.getAuthority())
            .collect(Collectors.toList());


        return ResponseEntity.ok(new UserData(user, null, roles));
    }

    @PostMapping("/refresh")
    public ResponseEntity<?> refreshToken(@RequestBody Map<String, String> request) {
        try {
            String refreshToken = request.get("refreshToken");
            
            if (refreshToken == null || refreshToken.trim().isEmpty()) {
                return ResponseEntity.badRequest().body("Refresh token is required");
            }
            
            RefreshToken token = refreshTokenService.findByToken(refreshToken);
            if (token == null) {
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body("Invalid refresh token");
            }
            
            refreshTokenService.verifyExpiration(token);
            
            refreshTokenService.updateLastUsed(refreshToken);
            
            Users user = token.getUser();
            if (user.getStatus() != UserStatus.ACTIVE) {
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body("User account is inactive");
            }
            
            UserPrincipal userPrincipal = UserPrincipal.create(user);
            String newAccessToken = jwtTokenProvider.taoToken(userPrincipal);
            
            List<String> roles = userPrincipal.getAuthorities().stream()
                .map(authority -> authority.getAuthority())
                .collect(Collectors.toList());
            
            UserData response = new UserData(user, newAccessToken, roles, refreshToken);
            
            return ResponseEntity.ok(response);
            
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body("Invalid or expired refresh token");
        }
    }

    @PutMapping("/change-password")
    public ResponseEntity<?> changePassword(@RequestBody Map<String, String> body) {
        try {
            Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
            
            if (authentication == null || !(authentication.getPrincipal() instanceof UserPrincipal)) {
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("error", "Unauthorized"));
            }

            UserPrincipal userPrincipal = (UserPrincipal) authentication.getPrincipal();
            Users currentUser = usersService.findByManv(userPrincipal.getUsername());
            
            if (currentUser == null) {
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("error", "User not found"));
            }
            
            String currentPassword = body.get("currentPassword");
            String newPassword = body.get("newPassword");
            

            if (currentPassword == null || !passwordEncoder.matches(currentPassword, currentUser.getPasswordHash())) {
                return ResponseEntity.badRequest().body(Map.of("error", "Mật khẩu hiện tại không đúng"));
            }
            

            if (newPassword == null || newPassword.trim().length() < 6) {
                return ResponseEntity.badRequest().body(Map.of("error", "Mật khẩu mới phải có ít nhất 6 ký tự"));
            }
            

            if (passwordEncoder.matches(newPassword, currentUser.getPasswordHash())) {
                return ResponseEntity.badRequest().body(Map.of("error", "Mật khẩu mới phải khác mật khẩu hiện tại"));
            }
            
            currentUser.setPasswordHash(passwordEncoder.encode(newPassword));
            usersService.update(currentUser);
            
            return ResponseEntity.ok(Map.of("message", "Đổi mật khẩu thành công"));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", "Không thể đổi mật khẩu: " + e.getMessage()));
        }
    }
}

