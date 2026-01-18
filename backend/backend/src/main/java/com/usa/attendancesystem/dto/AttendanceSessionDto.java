package com.usa.attendancesystem.dto;

import java.time.Instant;
import java.time.LocalDate;

/**
 * DTO for attendance session information
 */
public record AttendanceSessionDto(
        Long id,
        Integer batchId,
        String batchYear,
        Integer subjectId,
        String subjectName,
        LocalDate sessionDate,
        boolean isActive,
        Instant createdAt
        ) {

}
