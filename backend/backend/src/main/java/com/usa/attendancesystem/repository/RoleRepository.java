package com.usa.attendancesystem.repository;

import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import com.usa.attendancesystem.model.ERole;
import com.usa.attendancesystem.model.Role;

@Repository
public interface RoleRepository extends JpaRepository<Role, Integer> {

    /**
     * Find a role by its name
     *
     * @param name the role enum (e.g., ERole.ROLE_SUPER_ADMIN,
     * ERole.ROLE_STAFF)
     * @return Optional containing the role if found
     */
    Optional<Role> findByName(ERole name);

    /**
     * Check if a role exists with the given name
     *
     * @param name the role enum to check
     * @return true if role exists, false otherwise
     */
    boolean existsByName(ERole name);
}
