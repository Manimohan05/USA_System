package com.usa.attendancesystem.repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import com.usa.attendancesystem.model.FeePayment;
import com.usa.attendancesystem.model.Student;

@Repository
public interface FeePaymentRepository extends JpaRepository<FeePayment, UUID> {

    /**
     * Check if a fee payment exists for a student in a specific month/year.
     */
    @Query("SELECT fp FROM FeePayment fp WHERE fp.student.id = :studentId AND fp.month = :month AND fp.year = :year")
    Optional<FeePayment> findByStudentAndMonthAndYear(
            @Param("studentId") UUID studentId,
            @Param("month") Integer month,
            @Param("year") Integer year
    );

    /**
     * Get all fee payments for a specific month and year, filtered by batch and
     * subject.
     */
    @Query("SELECT fp FROM FeePayment fp "
            + "JOIN fp.student s "
            + "WHERE fp.month = :month AND fp.year = :year "
            + "AND (:batchId IS NULL OR s.batch.id = :batchId) "
            + "AND (:subjectId IS NULL OR EXISTS (SELECT 1 FROM s.subjects sub WHERE sub.id = :subjectId)) "
            + "AND (:studentIdCode IS NULL OR s.studentIdCode = :studentIdCode)")
    List<FeePayment> findFeePaymentsByFilters(
            @Param("month") Integer month,
            @Param("year") Integer year,
            @Param("batchId") Integer batchId,
            @Param("subjectId") Integer subjectId,
            @Param("studentIdCode") String studentIdCode
    );

    /**
     * Get all students who should have fee records for reporting, filtered by
     * criteria.
     */
    @Query("SELECT DISTINCT s FROM Student s "
            + "WHERE s.isActive = true "
            + "AND (:batchId IS NULL OR s.batch.id = :batchId) "
            + "AND (:subjectId IS NULL OR EXISTS (SELECT 1 FROM s.subjects sub WHERE sub.id = :subjectId)) "
            + "AND (:studentIdCode IS NULL OR s.studentIdCode = :studentIdCode)")
    List<Student> findStudentsForFeeReport(
            @Param("batchId") Integer batchId,
            @Param("subjectId") Integer subjectId,
            @Param("studentIdCode") String studentIdCode
    );
}
