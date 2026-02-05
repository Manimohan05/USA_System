package com.usa.attendancesystem.dto;

import java.time.Instant;
import java.time.LocalDate;
import java.util.UUID;

/**
 * DTO representing a single attendance record for reporting purposes.
 */
public record AttendanceRecordDto(
        UUID studentId,
        String studentIdCode,
        String studentName,
        String subjectName,
        LocalDate sessionDate,
        Instant markedAt, // When the student was marked present
        String status // "Present" or "Absent"
        ) {

    /**
     * Factory method for present students
     */
    public static AttendanceRecordDto createPresentRecord(
            UUID studentId,
            String studentIdCode,
            String studentName,
            String subjectName,
            LocalDate sessionDate,
            Instant markedAt) {
        return new AttendanceRecordDto(
                studentId, studentIdCode, studentName, subjectName,
                sessionDate, markedAt, "Present"
        );
    }

    /**
     * Factory method for absent students
     */
    public static AttendanceRecordDto createAbsentRecord(
            UUID studentId,
            String studentIdCode,
            String studentName,
            String subjectName,
            LocalDate sessionDate) {
        return new AttendanceRecordDto(
                studentId, studentIdCode, studentName, subjectName,
                sessionDate, null, "Absent"
        );
    }
}
