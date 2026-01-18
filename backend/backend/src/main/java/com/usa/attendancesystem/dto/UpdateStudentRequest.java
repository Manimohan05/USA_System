package com.usa.attendancesystem.dto;

import java.util.Set;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

/**
 * DTO for the request to update an existing student's details.
 */
public record UpdateStudentRequest(
        @NotBlank(message = "Full name is required")
        @Size(max = 255)
        String fullName,
        @NotBlank(message = "Parent phone number is required")
        @Size(max = 20)
        String parentPhone,
        @Size(max = 20)
        String studentPhone,
        @NotNull(message = "Batch ID is required")
        Integer batchId,
        @NotEmpty(message = "At least one subject ID is required")
        Set<Integer> subjectIds
        ) {

}
