package com.usa.attendancesystem.dto;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;

/**
 * DTO for fee report requests with filtering options.
 */
public record FeeReportRequest(
        Integer batchId,
        Integer subjectId,
        String studentIdCode,
        @NotNull(message = "Month is required")
        @Min(value = 1, message = "Month must be between 1 and 12")
        @Max(value = 12, message = "Month must be between 1 and 12")
        Integer month,
        @NotNull(message = "Year is required")
        @Min(value = 2020, message = "Year must be valid")
        Integer year
        ) {

}
