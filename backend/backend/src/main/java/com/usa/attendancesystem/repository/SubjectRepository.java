package com.usa.attendancesystem.repository;

import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import com.usa.attendancesystem.model.Subject;

/**
 * Repository interface for Subject data access.
 */
@Repository
public interface SubjectRepository extends JpaRepository<Subject, Integer> {

    // Custom query method to find a subject by its name, used for validation.
    Optional<Subject> findByName(String name);
}