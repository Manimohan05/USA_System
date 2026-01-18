package com.usa.attendancesystem.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

/**
 * DTO for the public kiosk request to mark a student's attendance.
 */
public record AttendanceMarkRequest(
    @NotBlank(message = "Student ID code is required")
    String studentIdCode,

    @NotNull(message = "Subject ID is required")
    Integer subjectId,

    @NotNull(message = "Batch ID is required")
    Integer batchId
) {}