package com.usa.attendancesystem.repository;

import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import com.usa.attendancesystem.model.Batch;

/**
 * Repository interface for Batch data access.
 * Spring Data JPA will automatically implement this interface.
 */
@Repository
public interface BatchRepository extends JpaRepository<Batch, Integer> {
    
    // Custom query method to find a batch by its year, used for validation.
    Optional<Batch> findByBatchYear(int year);
}