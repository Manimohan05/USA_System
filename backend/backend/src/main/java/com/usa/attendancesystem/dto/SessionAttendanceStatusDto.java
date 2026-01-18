package com.usa.attendancesystem.dto;

import java.time.Instant;
import java.util.List;

/**
 * DTO for session attendance status showing marked students
 */
public record SessionAttendanceStatusDto(
        Long sessionId,
        String sessionInfo, // e.g., "Batch 2024 - Mathematics - 2025-12-01"
        int totalEnrolledStudents,
        int presentCount,
        List<MarkedStudentDto> markedStudents
        ) {

    /**
     * DTO for students who have marked attendance
     */
    public record MarkedStudentDto(
            String studentIdCode,
            String indexNumber,
            String fullName,
            Instant markedAt
            ) {

    }
}
