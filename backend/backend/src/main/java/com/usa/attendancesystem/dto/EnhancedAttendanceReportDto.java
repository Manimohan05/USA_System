package com.usa.attendancesystem.dto;

import java.time.LocalDate;
import java.util.List;

/**
 * Enhanced DTO for attendance report responses that supports both single-date
 * and date-range reports with student-specific filtering.
 */
public record EnhancedAttendanceReportDto(
        LocalDate startDate, // For date range reports, this is the start date; for single date, same as endDate
        LocalDate endDate, // For date range reports, this is the end date; for single date, this is the report date
        String studentName, // Present if this is a student-specific report
        String studentIdCode, // Present if this is a student-specific report
        String batchName, // Name/year of the batch
        String subjectName, // Name of the subject
        List<AttendanceRecordDto> attendanceRecords, // All attendance records in the date range
        int totalPresentDays, // Number of days student was present (for student-specific reports)
        int totalClassDays, // Total number of class days in the period
        double attendancePercentage // Attendance percentage (for student-specific reports)
        ) {

    /**
     * Factory method for single-date reports (backward compatibility)
     */
    public static EnhancedAttendanceReportDto createSingleDateReport(
            LocalDate date,
            String batchName,
            String subjectName,
            List<AttendanceRecordDto> records) {
        return new EnhancedAttendanceReportDto(
                date, date, null, null, batchName, subjectName,
                records, 0, 0, 0.0
        );
    }

    /**
     * Factory method for student-specific date range reports
     */
    public static EnhancedAttendanceReportDto createStudentReport(
            LocalDate startDate,
            LocalDate endDate,
            String studentName,
            String studentIdCode,
            String batchName,
            String subjectName,
            List<AttendanceRecordDto> records,
            int totalPresentDays,
            int totalClassDays) {

        double percentage = totalClassDays > 0 ? (double) totalPresentDays / totalClassDays * 100 : 0.0;

        return new EnhancedAttendanceReportDto(
                startDate, endDate, studentName, studentIdCode, batchName, subjectName,
                records, totalPresentDays, totalClassDays, percentage
        );
    }

}
