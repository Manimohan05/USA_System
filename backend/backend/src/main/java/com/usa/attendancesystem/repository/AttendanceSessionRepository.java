package com.usa.attendancesystem.repository;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import com.usa.attendancesystem.model.AttendanceSession;

@Repository
public interface AttendanceSessionRepository extends JpaRepository<AttendanceSession, Long> {

    @Query("SELECT s FROM AttendanceSession s WHERE s.batch.id = :batchId AND s.subject.id = :subjectId AND s.sessionDate = :sessionDate")
    Optional<AttendanceSession> findByBatchAndSubjectAndDate(
            @Param("batchId") Integer batchId,
            @Param("subjectId") Integer subjectId,
            @Param("sessionDate") LocalDate sessionDate);

    @Query("SELECT s FROM AttendanceSession s WHERE s.batch.id = :batchId AND s.subject.id = :subjectId AND s.sessionDate = :sessionDate AND s.isActive = true")
    Optional<AttendanceSession> findActiveSessionByBatchAndSubjectAndDate(
            @Param("batchId") Integer batchId,
            @Param("subjectId") Integer subjectId,
            @Param("sessionDate") LocalDate sessionDate);

    @Query("SELECT s FROM AttendanceSession s WHERE s.sessionDate = :date AND s.isActive = true ORDER BY s.createdAt DESC")
    List<AttendanceSession> findActiveSessionsByDate(@Param("date") LocalDate date);

    @Query("SELECT s FROM AttendanceSession s WHERE s.sessionDate = :date ORDER BY s.createdAt DESC")
    List<AttendanceSession> findAllSessionsByDate(@Param("date") LocalDate date);

    @Query("SELECT s FROM AttendanceSession s WHERE s.isActive = true ORDER BY s.createdAt DESC")
    List<AttendanceSession> findAllActiveSessions();

    @Query("SELECT s FROM AttendanceSession s WHERE s.id = :sessionId AND s.isActive = true")
    Optional<AttendanceSession> findActiveSessionById(@Param("sessionId") Long sessionId);

        boolean existsByBatch_IdAndIsActiveTrue(Integer batchId);

        boolean existsBySubject_IdAndIsActiveTrue(Integer subjectId);

    /**
     * Finds all sessions for a specific subject within a date range. Used for
     * calculating total class days for student reports.
     */
    @Query("SELECT s FROM AttendanceSession s "
            + "WHERE s.subject.id = :subjectId "
            + "AND s.sessionDate >= :startDate "
            + "AND s.sessionDate <= :endDate "
            + "ORDER BY s.sessionDate ASC")
    List<AttendanceSession> findBySubjectAndDateRange(
            @Param("subjectId") Integer subjectId,
            @Param("startDate") LocalDate startDate,
            @Param("endDate") LocalDate endDate
    );

}
