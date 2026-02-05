package com.usa.attendancesystem.dto;

import java.time.LocalDate;
import java.util.UUID;

import com.fasterxml.jackson.annotation.JsonFormat;

import lombok.Data;

/**
 * DTO for attendance report request with enhanced filtering options. Supports
 * filtering by student ID, subject, and date range while preserving existing
 * functionality for batch/subject/single date reports.
 */
@Data
public class AttendanceReportRequest {

    // Single date (for existing functionality - backward compatibility)
    @JsonFormat(pattern = "yyyy-MM-dd")
    private LocalDate date;

    // Date range filtering (new functionality)
    @JsonFormat(pattern = "yyyy-MM-dd")
    private LocalDate startDate;

    @JsonFormat(pattern = "yyyy-MM-dd")
    private LocalDate endDate;

    // Batch and subject filtering (existing functionality)
    private Integer batchId;
    private Integer subjectId;

    // Student-specific filtering (new functionality)
    private UUID studentId;
    private String studentIdCode; // Alternative to studentId for convenience

    // Validation method to ensure at least one date parameter is provided
    public boolean hasValidDateRange() {
        return (date != null) || (startDate != null && endDate != null);
    }

    // Method to determine if this is a date range request
    public boolean isDateRangeRequest() {
        return startDate != null && endDate != null;
    }

    // Method to determine if this is a student-specific request
    public boolean isStudentSpecificRequest() {
        return studentId != null || (studentIdCode != null && !studentIdCode.trim().isEmpty());
    }
}
