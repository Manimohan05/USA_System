package com.usa.attendancesystem.dto;

import java.time.LocalDate;
import java.util.List;

/**
 * DTO to send the complete attendance report to the admin dashboard. It clearly
 * separates present and absent students and includes the report date.
 */
public record AttendanceReportDto(
        LocalDate date,
        List<PresentStudentDto> presentStudents,
        List<StudentDto> absentStudents
        ) {

}
