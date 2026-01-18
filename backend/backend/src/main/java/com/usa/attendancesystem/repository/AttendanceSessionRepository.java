package com.usa.attendancesystem.repository;

import com.usa.attendancesystem.model.AttendanceSession;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

@Repository
public interface AttendanceSessionRepository extends JpaRepository<AttendanceSession, Long> {

    @Query("SELECT s FROM AttendanceSession s WHERE s.batch.id = :batchId AND s.subject.id = :subjectId AND s.sessionDate = :sessionDate")
    Optional<AttendanceSession> findByBatchAndSubjectAndDate(
            @Param("batchId") Integer batchId,
            @Param("subjectId") Integer subjectId,
            @Param("sessionDate") LocalDate sessionDate);

    @Query("SELECT s FROM AttendanceSession s WHERE s.sessionDate = :date AND s.isActive = true ORDER BY s.createdAt DESC")
    List<AttendanceSession> findActiveSessionsByDate(@Param("date") LocalDate date);

    @Query("SELECT s FROM AttendanceSession s WHERE s.isActive = true ORDER BY s.createdAt DESC")
    List<AttendanceSession> findAllActiveSessions();

    @Query("SELECT s FROM AttendanceSession s WHERE s.id = :sessionId AND s.isActive = true")
    Optional<AttendanceSession> findActiveSessionById(@Param("sessionId") Long sessionId);
}
