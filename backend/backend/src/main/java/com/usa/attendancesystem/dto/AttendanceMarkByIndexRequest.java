package com.usa.attendancesystem.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

/**
 * DTO for marking attendance using index number in an active session
 */
public record AttendanceMarkByIndexRequest(
        @NotBlank(message = "Index number is required")
        String indexNumber,
        @NotNull(message = "Session ID is required")
        Long sessionId
        ) {

}
