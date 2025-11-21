package com.foxconn.sopchecklist.repository;

import com.foxconn.sopchecklist.entity.Users;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import java.util.Optional;
import java.util.List;

public interface UsersRepository extends JpaRepository<Users, Integer> {
    Optional<Users> findByManv(String manv);
    Optional<Users> findByEmail(String email);
    Optional<Users> findByPhone(String phone);
    

    Optional<Users> findByManvAndUserIDNot(String manv, Integer userID);

    Optional<Users> findByEmailAndUserIDNot(String email, Integer userID);

    Optional<Users> findByPhoneAndUserIDNot(String phone, Integer userID);

    List<Users> findDistinctByGroups_Id(Long groupId);
    
    /**
     * Tìm tất cả users và sắp xếp: ACTIVE trước, sau đó theo createdAt (tạo trước ở trên)
     */
    @Query("SELECT u FROM Users u ORDER BY " +
           "CASE WHEN u.status = com.foxconn.sopchecklist.entity.UserStatus.ACTIVE THEN 0 ELSE 1 END, " +
           "u.createdAt ASC")
    List<Users> findAllOrderedByStatusAndCreatedAt();
    
    /**
     * Tìm users theo groupId và sắp xếp: ACTIVE trước, sau đó theo createdAt (tạo trước ở trên)
     */
    @Query("SELECT DISTINCT u FROM Users u JOIN u.groups g WHERE g.id = :groupId ORDER BY " +
           "CASE WHEN u.status = com.foxconn.sopchecklist.entity.UserStatus.ACTIVE THEN 0 ELSE 1 END, " +
           "u.createdAt ASC")
    List<Users> findDistinctByGroups_IdOrderedByStatusAndCreatedAt(@Param("groupId") Long groupId);
}

