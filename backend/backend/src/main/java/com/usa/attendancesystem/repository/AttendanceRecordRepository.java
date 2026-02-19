package com.usa.attendancesystem.repository;

import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import com.usa.attendancesystem.model.AttendanceRecord;

@Repository
public interface AttendanceRecordRepository extends JpaRepository<AttendanceRecord, Long> {

    /**
     * Finds all attendance records for a given subject within a specific time
     * range (e.g., a single day). This is crucial for generating daily reports.
     */
    @Query("SELECT ar FROM AttendanceRecord ar WHERE ar.subject.id = :subjectId AND ar.attendanceTimestamp >= :startOfDay AND ar.attendanceTimestamp < :endOfDay")
    List<AttendanceRecord> findBySubjectAndDateRange(
            @Param("subjectId") Integer subjectId,
            @Param("startOfDay") Instant startOfDay,
            @Param("endOfDay") Instant endOfDay
    );

    /**
     * Checks if a student has already marked attendance for a specific subject
     * on a given day. This prevents duplicate check-ins.
     */
    @Query("SELECT COUNT(ar) > 0 FROM AttendanceRecord ar WHERE ar.student.id = :studentId AND ar.subject.id = :subjectId AND ar.attendanceTimestamp >= :startOfDay AND ar.attendanceTimestamp < :endOfDay")
    boolean hasStudentMarkedAttendanceToday(
            @Param("studentId") UUID studentId,
            @Param("subjectId") Integer subjectId,
            @Param("startOfDay") Instant startOfDay,
            @Param("endOfDay") Instant endOfDay
    );

    /**
     * Finds the attendance record for a student on a specific subject and day.
     * Used to get the exact time when attendance was marked.
     */
    @Query("SELECT ar FROM AttendanceRecord ar WHERE ar.student.id = :studentId AND ar.subject.id = :subjectId AND ar.attendanceTimestamp >= :startOfDay AND ar.attendanceTimestamp < :endOfDay")
    Optional<AttendanceRecord> findStudentAttendanceToday(
            @Param("studentId") UUID studentId,
            @Param("subjectId") Integer subjectId,
            @Param("startOfDay") Instant startOfDay,
            @Param("endOfDay") Instant endOfDay
    );

    /**
     * Finds all attendance records for a session (batch + subject + date). Used
     * to show who has already marked attendance in the session.
     */
    @Query("SELECT ar FROM AttendanceRecord ar "
            + "JOIN ar.student s "
            + "WHERE ar.subject.id = :subjectId "
            + "AND s.batch.id = :batchId "
            + "AND ar.attendanceTimestamp >= :startOfDay "
            + "AND ar.attendanceTimestamp < :endOfDay "
            + "ORDER BY ar.attendanceTimestamp ASC")
    List<AttendanceRecord> findSessionAttendanceRecords(
            @Param("batchId") Integer batchId,
            @Param("subjectId") Integer subjectId,
            @Param("startOfDay") Instant startOfDay,
            @Param("endOfDay") Instant endOfDay
    );

    /**
     * Finds all attendance records for a specific student within a date range.
     * Used for student-specific attendance reports.
     */
    @Query("SELECT ar FROM AttendanceRecord ar "
            + "WHERE ar.student.id = :studentId "
            + "AND ar.attendanceTimestamp >= :startTime "
            + "AND ar.attendanceTimestamp < :endTime "
            + "ORDER BY ar.attendanceTimestamp ASC")
    List<AttendanceRecord> findByStudentAndDateRange(
            @Param("studentId") UUID studentId,
            @Param("startTime") Instant startTime,
            @Param("endTime") Instant endTime
    );

    /**
     * Finds all attendance records for a specific student and subject within a
     * date range. Used for student-specific subject attendance reports.
     */
    @Query("SELECT ar FROM AttendanceRecord ar "
            + "WHERE ar.student.id = :studentId "
            + "AND ar.subject.id = :subjectId "
            + "AND ar.attendanceTimestamp >= :startTime "
            + "AND ar.attendanceTimestamp < :endTime "
            + "ORDER BY ar.attendanceTimestamp ASC")
    List<AttendanceRecord> findByStudentAndSubjectAndDateRange(
            @Param("studentId") UUID studentId,
            @Param("subjectId") Integer subjectId,
            @Param("startTime") Instant startTime,
            @Param("endTime") Instant endTime
    );

    /**
     * Finds all student IDs who have marked attendance for a specific subject
     * within a date range. Used for determining absent students during session
     * ending.
     */
    @Query("SELECT ar.student.id FROM AttendanceRecord ar "
            + "WHERE ar.subject.id = :subjectId "
            + "AND ar.attendanceTimestamp >= :startOfDay "
            + "AND ar.attendanceTimestamp < :endOfDay")
    List<UUID> findPresentStudentIdsBySubjectAndDateRange(
            @Param("subjectId") Integer subjectId,
            @Param("startOfDay") Instant startOfDay,
            @Param("endOfDay") Instant endOfDay
    );

    /**
     * Deletes all attendance records for a specific batch, subject, and date.
     * Used when deleting a session within 5 minutes of creation.
     */
    @Modifying
    @Query("DELETE FROM AttendanceRecord ar "
            + "WHERE ar.subject.id = :subjectId "
            + "AND ar.student.batch.id = :batchId "
            + "AND ar.attendanceDate = :sessionDate")
    void deleteByBatchSubjectAndDate(
            @Param("batchId") Integer batchId,
            @Param("subjectId") Integer subjectId,
            @Param("sessionDate") java.time.LocalDate sessionDate
    );

    /**
     * Deletes all attendance records for a specific batch.
     * Used for batch permanent deletion.
     */
    @Modifying
    @Query("DELETE FROM AttendanceRecord ar WHERE ar.student.batch.id = :batchId")
    void deleteByBatchId(@Param("batchId") Integer batchId);

}
