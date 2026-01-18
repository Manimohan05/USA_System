package com.usa.attendancesystem.dto;

import jakarta.validation.constraints.NotNull;
import java.time.LocalDate;

/**
 * DTO for creating a new attendance session
 */
public record AttendanceSessionCreateRequest(
        @NotNull(message = "Batch ID is required")
        Integer batchId,
        @NotNull(message = "Subject ID is required")
        Integer subjectId,
        @NotNull(message = "Session date is required")
        LocalDate sessionDate
        ) {

}
