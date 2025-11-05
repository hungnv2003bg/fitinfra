package com.foxconn.sopchecklist.service;

import com.foxconn.sopchecklist.entity.Users;
import com.foxconn.sopchecklist.entity.Role;
import com.foxconn.sopchecklist.entity.Group;
import java.util.List;
import java.util.Set;

public interface UsersService {
    Users findById(Integer id);
    Users save(Users user);
    Users update(Users user);
    void delete(Integer id);
    List<Users> findAll();
    List<Users> findByGroupId(Long groupId);
    Users findByManv(String manv);
    Users findByEmail(String email);
    Users findByPhone(String phone);
    Users assignRoles(Integer userId, Set<Role> roles);
    Users removeRole(Integer userId, Long roleId);
    Users assignGroups(Integer userId, Set<Group> groups);
    

    boolean existsByManv(String manv);
    boolean existsByEmail(String email);
    boolean existsByPhone(String phone);
    boolean existsByManvAndIdNot(String manv, Integer id);
    boolean existsByEmailAndIdNot(String email, Integer id);
    boolean existsByPhoneAndIdNot(String phone, Integer id);


    Users getCurrentAuthenticatedUser();
}

