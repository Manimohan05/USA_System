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
        Instant markedAt, // If already marked, when it was marked
    Boolean hasFeePaymentIssue, // True if student hasn't paid fees by attendance date
    Boolean playFeeDueSound // True if frontend should play fee due alert sound
        ) {

    // Success response
    public static AttendanceValidationResponseDto success(String message, StudentDto student, Instant markedAt) {
        return new AttendanceValidationResponseDto(true, message, null, student, markedAt, null, null);
    }

    // Success response with fee payment status
    public static AttendanceValidationResponseDto success(String message, StudentDto student, Instant markedAt, boolean hasFeePaymentIssue) {
        return new AttendanceValidationResponseDto(true, message, null, student, markedAt, hasFeePaymentIssue, hasFeePaymentIssue);
    }

    // Success response with fee payment status and sound control
    public static AttendanceValidationResponseDto success(
            String message,
            StudentDto student,
            Instant markedAt,
            boolean hasFeePaymentIssue,
            boolean playFeeDueSound
    ) {
        return new AttendanceValidationResponseDto(true, message, null, student, markedAt, hasFeePaymentIssue, playFeeDueSound);
    }

    // Error response
    public static AttendanceValidationResponseDto error(String message, String errorCode) {
        return new AttendanceValidationResponseDto(false, message, errorCode, null, null, null, null);
    }

    // Error response with student info
    public static AttendanceValidationResponseDto error(String message, String errorCode, StudentDto student) {
        return new AttendanceValidationResponseDto(false, message, errorCode, student, null, null, null);
    }

    // Already marked response
    public static AttendanceValidationResponseDto alreadyMarked(String message, StudentDto student, Instant markedAt) {
        return new AttendanceValidationResponseDto(false, message, "ALREADY_MARKED", student, markedAt, null, null);
    }
}
