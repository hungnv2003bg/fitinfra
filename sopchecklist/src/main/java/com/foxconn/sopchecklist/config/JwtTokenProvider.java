package com.foxconn.sopchecklist.config;

import com.foxconn.sopchecklist.entity.Users;
import com.foxconn.sopchecklist.entity.UserStatus;
import com.foxconn.sopchecklist.service.UsersService;
import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.SignatureAlgorithm;
import io.jsonwebtoken.security.Keys;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.annotation.Lazy;
import org.springframework.stereotype.Component;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.security.Key;
import java.util.Date;
import java.util.Base64;
import java.nio.charset.StandardCharsets;

@Component
public class JwtTokenProvider {
    
    private static final Logger logger = LoggerFactory.getLogger(JwtTokenProvider.class);
    
    @Autowired
    @Lazy
    private UsersService usersService;
    
    private static final String SECRET_KEY = "mySecretKey123456789012345678901234567890123456789012345678901234567890123456789012345678901234567890";
    private static final long EXPIRATION_TIME = 3600000; // 1 hour 
    
    private Key getSigningKey() {
        return Keys.hmacShaKeyFor(SECRET_KEY.getBytes());
    }
    
    public String taoToken(UserPrincipal userPrincipal) {
        Date now = new Date();
        Date expiryDate = new Date(now.getTime() + EXPIRATION_TIME);
        
        try {
            String encodedFullName = userPrincipal.getFullName() != null ? 
                Base64.getEncoder().encodeToString(userPrincipal.getFullName().getBytes(StandardCharsets.UTF_8)) : null;
            
            return Jwts.builder()
                    .setSubject(userPrincipal.getUsername())
                    .setIssuedAt(now)
                    .setExpiration(expiryDate)
                    .claim("userId", userPrincipal.getUserId())
                    .claim("fullName", encodedFullName)
                    .claim("email", userPrincipal.getEmail())
                    .signWith(getSigningKey(), SignatureAlgorithm.HS512)
                    .compact();
        } catch (Exception e) {
            logger.error("Error creating JWT token for user: {}, fullName: {}", 
                userPrincipal.getUsername(), userPrincipal.getFullName(), e);
            throw new RuntimeException("Failed to create JWT token", e);
        }
    }
    
    public String getUsernameFromToken(String token) {
        Claims claims = Jwts.parserBuilder()
                .setSigningKey(getSigningKey())
                .build()
                .parseClaimsJws(token)
                .getBody();
        return claims.getSubject();
    }
    
    public boolean validateToken(String token) {
        try {
            Claims claims = Jwts.parserBuilder()
                .setSigningKey(getSigningKey())
                .build()
                .parseClaimsJws(token)
                .getBody();
            
            String username = claims.getSubject();
            if (username == null || username.isEmpty()) {
                logger.debug("Token validation failed: username is null or empty");
                return false;
            }
            
            Users user = usersService.findByManv(username);
            if (user == null) {
                logger.debug("Token validation failed: user not found for username: {}", username);
                return false;
            }

            if (user.getStatus() != UserStatus.ACTIVE) {
                logger.debug("Token validation failed: user status is not ACTIVE for username: {}", username);
                return false;
            }
            
            return true;
        } catch (Exception e) {
            logger.error("JWT token validation failed: {}", e.getMessage(), e);
            return false;
        }
    }
    
    public String getFullNameFromToken(String token) {
        try {
            Claims claims = Jwts.parserBuilder()
                .setSigningKey(getSigningKey())
                .build()
                .parseClaimsJws(token)
                .getBody();
            
            String encodedFullName = claims.get("fullName", String.class);
            if (encodedFullName != null) {
                byte[] decodedBytes = Base64.getDecoder().decode(encodedFullName);
                return new String(decodedBytes, StandardCharsets.UTF_8);
            }
            return null;
        } catch (Exception e) {
            logger.error("Error extracting fullName from token: {}", e.getMessage(), e);
            return null;
        }
    }
}

