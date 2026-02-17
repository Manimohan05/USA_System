package com.usa.attendancesystem.repository;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import com.usa.attendancesystem.model.Batch;

/**
 * Repository interface for Batch data access. Spring Data JPA will
 * automatically implement this interface.
 */
@Repository
public interface BatchRepository extends JpaRepository<Batch, Integer> {

    // Custom query method to find a batch by its year, used for validation.
    Optional<Batch> findByBatchYear(int year);

    // Find batch by year and day batch flag for validation
    Optional<Batch> findByBatchYearAndIsDayBatch(int year, boolean isDayBatch);

    // Find all active (non-archived) batches
    List<Batch> findByIsArchivedFalse();

    // Find all archived batches
    List<Batch> findByIsArchivedTrue();
}
