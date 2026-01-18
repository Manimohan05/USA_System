package com.usa.attendancesystem.repository;

import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import com.usa.attendancesystem.model.Admin;

@Repository
public interface AdminRepository extends JpaRepository<Admin, Integer> {

    /**
     * Find an admin by username for authentication
     *
     * @param username the username to search for
     * @return Optional containing the admin if found
     */
    Optional<Admin> findByUsername(String username);

    /**
     * Check if an admin exists with the given username
     *
     * @param username the username to check
     * @return true if admin exists, false otherwise
     */
    boolean existsByUsername(String username);
}
