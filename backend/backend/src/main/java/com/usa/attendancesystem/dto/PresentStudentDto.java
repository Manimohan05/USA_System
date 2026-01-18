package com.usa.attendancesystem.dto;

import java.time.Instant;
import java.util.UUID;

/**
 * A specialized DTO for the report, including the check-in time.
 */
public record PresentStudentDto(
    UUID id,
    String studentIdCode,
    String fullName,
    Instant checkInTime
) {}