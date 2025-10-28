package com.foxconn.sopchecklist.repository;

import com.foxconn.sopchecklist.entity.Users;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.Optional;

public interface UsersRepository extends JpaRepository<Users, Integer> {
    Optional<Users> findByManv(String manv);
    Optional<Users> findByEmail(String email);
    Optional<Users> findByPhone(String phone);
    

    Optional<Users> findByManvAndUserIDNot(String manv, Integer userID);

    Optional<Users> findByEmailAndUserIDNot(String email, Integer userID);

    Optional<Users> findByPhoneAndUserIDNot(String phone, Integer userID);
}

