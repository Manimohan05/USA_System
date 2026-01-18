package com.usa.attendancesystem.dto;

/**
 * DTO for getting targeted student counts based on messaging criteria.
 */
public record TargetedStudentCountDto(
        long studentCount,
        long parentContactCount
        ) {

}
