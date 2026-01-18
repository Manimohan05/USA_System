package com.usa.attendancesystem.dto;

import java.util.Set;
import java.util.UUID;

/**
 * A comprehensive DTO for displaying student details.
 */
public record StudentDto(
        UUID id,
        String studentIdCode,
        String indexNumber,
        String fullName,
        String parentPhone,
        String studentPhone,
        boolean isActive,
        BatchDto batch,
        Set<SubjectDto> subjects
        ) {

}
