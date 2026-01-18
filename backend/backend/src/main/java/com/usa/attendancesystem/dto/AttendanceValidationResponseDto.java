package com.usa.attendancesystem.dto;

import java.time.Instant;

/**
 * DTO for attendance validation response with detailed feedback
 */
public record AttendanceValidationResponseDto(
        boolean success,
        String message,
        String errorCode, // For frontend to handle specific error types
        StudentDto student, // Student info if found
        Instant markedAt // If already marked, when it was marked
        ) {

    // Success response
    public static AttendanceValidationResponseDto success(String message, StudentDto student, Instant markedAt) {
        return new AttendanceValidationResponseDto(true, message, null, student, markedAt);
    }

    // Error response
    public static AttendanceValidationResponseDto error(String message, String errorCode) {
        return new AttendanceValidationResponseDto(false, message, errorCode, null, null);
    }

    // Error response with student info
    public static AttendanceValidationResponseDto error(String message, String errorCode, StudentDto student) {
        return new AttendanceValidationResponseDto(false, message, errorCode, student, null);
    }

    // Already marked response
    public static AttendanceValidationResponseDto alreadyMarked(String message, StudentDto student, Instant markedAt) {
        return new AttendanceValidationResponseDto(false, message, "ALREADY_MARKED", student, markedAt);
    }
}
