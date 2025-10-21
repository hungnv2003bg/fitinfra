package com.foxconn.sopchecklist.config;

import com.foxconn.sopchecklist.entity.Users;
import com.foxconn.sopchecklist.service.UsersService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Service;

@Service
public class CustomUserDetailsService implements UserDetailsService {

    @Autowired
    private UsersService usersService;

    @Override
    public UserDetails loadUserByUsername(String username) throws UsernameNotFoundException {
        Users user = usersService.findByManv(username);
        if (user == null) {
            user = usersService.findByEmail(username);
        }
        
        if (user == null) {
            throw new UsernameNotFoundException("User not found: " + username);
        }
        
        return UserPrincipal.create(user);
    }
}

