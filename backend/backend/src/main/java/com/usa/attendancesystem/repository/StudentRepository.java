package com.usa.attendancesystem.repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import com.usa.attendancesystem.model.Student;

@Repository
public interface StudentRepository extends JpaRepository<Student, UUID> {

    /**
     * Finds a student by their unique, human-readable ID code. Used for
     * validation to prevent duplicate student IDs.
     */
    Optional<Student> findByStudentIdCode(String studentIdCode);

    /**
     * Finds a student by ID code and eagerly loads enrolled subjects.
     */
    @Query("SELECT s FROM Student s LEFT JOIN FETCH s.subjects WHERE s.studentIdCode = :studentIdCode")
    Optional<Student> findByStudentIdCodeWithSubjects(@Param("studentIdCode") String studentIdCode);

    /**
     * Finds a student by their unique index number. Used for attendance
     * marking.
     */
    Optional<Student> findByIndexNumber(String indexNumber);

    /**
     * Finds a student by their index number (case-insensitive with trimming).
     */
    @Query("SELECT s FROM Student s WHERE UPPER(TRIM(s.indexNumber)) = UPPER(TRIM(:indexNumber))")
    Optional<Student> findByIndexNumberIgnoreCase(@Param("indexNumber") String indexNumber);

    /**
     * Finds all active students belonging to a specific batch and enrolled in a
     * specific subject. This is the core query for filtering the student list
     * in the admin dashboard. Excludes students from archived batches.
     */
    @Query("SELECT s FROM Student s JOIN s.subjects sub WHERE s.batch.id = :batchId AND sub.id = :subjectId AND s.isActive = true AND s.batch.isArchived = false")
    List<Student> findActiveStudentsByBatchAndSubject(@Param("batchId") Integer batchId, @Param("subjectId") Integer subjectId);

    /**
     * Finds all active students for dashboard statistics. Excludes students from archived batches.
     */
    @Query("SELECT s FROM Student s WHERE s.isActive = true AND s.batch.isArchived = false")
    List<Student> findByIsActiveTrueAndBatchNotArchived();

    /**
     * Finds all archived (inactive) students.
     */
    List<Student> findByIsActiveFalse();

    /**
     * Finds all active students belonging to a specific batch. Used for
     * filtering by batch only. Excludes students from archived batches.
     */
    @Query("SELECT s FROM Student s WHERE s.batch.id = :batchId AND s.isActive = true AND s.batch.isArchived = false")
    List<Student> findActiveStudentsByBatch(@Param("batchId") Integer batchId);

    /**
     * Finds all active students enrolled in a specific subject. Used for
     * filtering by subject only. Excludes students from archived batches.
     */
    @Query("SELECT s FROM Student s JOIN s.subjects sub WHERE sub.id = :subjectId AND s.isActive = true AND s.batch.isArchived = false")
    List<Student> findActiveStudentsBySubject(@Param("subjectId") Integer subjectId);

    /**
     * Counts all active students enrolled in a specific subject. Excludes students from archived batches.
     */
    @Query("SELECT COUNT(s) FROM Student s JOIN s.subjects sub WHERE sub.id = :subjectId AND s.isActive = true AND s.batch.isArchived = false")
    Long countActiveStudentsBySubject(@Param("subjectId") Integer subjectId);

    /**
     * Counts all active students belonging to a specific batch. Excludes students from archived batches.
     */
    @Query("SELECT COUNT(s) FROM Student s WHERE s.batch.id = :batchId AND s.isActive = true AND s.batch.isArchived = false")
    Long countActiveStudentsByBatch(@Param("batchId") Integer batchId);

    /**
     * Finds the highest index number for auto-generation. Returns the student
     * with the highest index number (lexicographically).
     */
    @Query("SELECT s FROM Student s ORDER BY s.indexNumber DESC")
    List<Student> findAllOrderByIndexNumberDesc();

    /**
     * Finds the highest student ID code for auto-generation. Returns students
     * ordered by student ID code descending.
     */
    @Query("SELECT s FROM Student s ORDER BY s.studentIdCode DESC")
    List<Student> findAllOrderByStudentIdCodeDesc();

    /**
     * Counts all active students in the system.
     */
    Long countByIsActiveTrue();

    /**
     * Counts active students who have a parent phone number (for messaging
     * stats).
     */
    @Query("SELECT COUNT(s) FROM Student s WHERE s.isActive = true AND s.parentPhone IS NOT NULL AND TRIM(s.parentPhone) != ''")
    Long countActiveStudentsWithParentPhone();

    /**
     * Finds students in a specific batch ordered by index number descending.
     * Used for generating next index number for batch-based indexing.
     */
    @Query("SELECT s FROM Student s WHERE s.batch.id = :batchId ORDER BY s.indexNumber DESC")
    List<Student> findByBatchIdOrderByIndexNumberDesc(@Param("batchId") Integer batchId);

    /**
     * Checks if an index number already exists.
     */
    boolean existsByIndexNumber(String indexNumber);
}
