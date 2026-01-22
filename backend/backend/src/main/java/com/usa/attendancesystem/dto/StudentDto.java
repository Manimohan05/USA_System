package com.usa.attendancesystem.dto;

import java.time.LocalDate;
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
        String address,
        String nic,
        String school,
        LocalDate admissionDate,
        String parentPhone,
        boolean isActive,
        BatchDto batch,
        Set<SubjectDto> subjects
        ) {

}
