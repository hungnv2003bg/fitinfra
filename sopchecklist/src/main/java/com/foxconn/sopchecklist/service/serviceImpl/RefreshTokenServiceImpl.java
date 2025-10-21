package com.foxconn.sopchecklist.service.serviceImpl;

import com.foxconn.sopchecklist.entity.RefreshToken;
import com.foxconn.sopchecklist.entity.Users;
import com.foxconn.sopchecklist.repository.RefreshTokenRepository;
import com.foxconn.sopchecklist.service.RefreshTokenService;
import com.foxconn.sopchecklist.service.TimeService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.security.SecureRandom;
import java.time.LocalDateTime;
import java.util.Base64;

@Service
@Transactional
public class RefreshTokenServiceImpl implements RefreshTokenService {

    @Autowired
    private RefreshTokenRepository refreshTokenRepository;
    
    @Autowired
    private TimeService timeService;
    
    private static final int REFRESH_TOKEN_EXPIRY_DAYS = 7; // 7 days
    private static final SecureRandom secureRandom = new SecureRandom();

    @Override
    public RefreshToken createRefreshToken(Users user) {
        // Revoke all existing tokens for this user
        revokeAllByUserId(user.getUserID());
        
        // Generate new refresh token
        String token = generateRefreshToken();
        
        RefreshToken refreshToken = new RefreshToken();
        refreshToken.setToken(token);
        refreshToken.setUser(user);
        refreshToken.setExpiresAt(timeService.nowVietnam().plusDays(REFRESH_TOKEN_EXPIRY_DAYS));
        refreshToken.setCreatedAt(timeService.nowVietnam());
        refreshToken.setLastUsedAt(timeService.nowVietnam());
        refreshToken.setIsRevoked(false);
        
        return refreshTokenRepository.save(refreshToken);
    }

    @Override
    @Transactional(readOnly = true)
    public RefreshToken findByToken(String token) {
        return refreshTokenRepository.findByTokenAndIsRevokedFalse(token).orElse(null);
    }

    @Override
    public RefreshToken verifyExpiration(RefreshToken token) {
        if (token == null) {
            throw new RuntimeException("Refresh token is null");
        }
        
        if (token.getIsRevoked()) {
            throw new RuntimeException("Refresh token has been revoked");
        }
        
        if (token.getExpiresAt().isBefore(timeService.nowVietnam())) {
            throw new RuntimeException("Refresh token has expired");
        }
        
        return token;
    }

    @Override
    public void revokeAllByUserId(Integer userId) {
        refreshTokenRepository.revokeAllByUserId(userId);
    }

    @Override
    public void updateLastUsed(String token) {
        refreshTokenRepository.updateLastUsed(token, timeService.nowVietnam());
    }

    @Override
    public void cleanupExpiredTokens() {
        refreshTokenRepository.deleteExpiredTokens(timeService.nowVietnam());
    }
    
    private String generateRefreshToken() {
        byte[] randomBytes = new byte[64];
        secureRandom.nextBytes(randomBytes);
        return Base64.getUrlEncoder().withoutPadding().encodeToString(randomBytes);
    }
}
