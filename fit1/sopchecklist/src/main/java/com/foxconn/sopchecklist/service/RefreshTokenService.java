package com.foxconn.sopchecklist.service;

import com.foxconn.sopchecklist.entity.RefreshToken;
import com.foxconn.sopchecklist.entity.Users;

public interface RefreshTokenService {
    
    RefreshToken createRefreshToken(Users user);
    
    RefreshToken findByToken(String token);
    
    RefreshToken verifyExpiration(RefreshToken token);
    
    void revokeAllByUserId(Integer userId);
    
    void updateLastUsed(String token);
    
    void cleanupExpiredTokens();
}
