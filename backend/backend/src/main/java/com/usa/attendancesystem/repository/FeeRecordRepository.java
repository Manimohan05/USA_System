package com.usa.attendancesystem.repository;

import com.usa.attendancesystem.model.FeeRecord;
import com.usa.attendancesystem.model.FeeStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

@Repository
public interface FeeRecordRepository extends JpaRepository<FeeRecord, Long> {

    /**
     * Finds all fee records for a specific student.
     */
    List<FeeRecord> findByStudentId(UUID studentId);

    /**
     * Finds all fee records that are not fully paid and whose due date has passed.
     * This is the core query for sending automated reminders.
     */
    @Query("SELECT fr FROM FeeRecord fr WHERE fr.status IN :statuses AND fr.dueDate < :currentDate")
    List<FeeRecord> findOverdueFees(@Param("statuses") List<FeeStatus> statuses, @Param("currentDate") LocalDate currentDate);
}