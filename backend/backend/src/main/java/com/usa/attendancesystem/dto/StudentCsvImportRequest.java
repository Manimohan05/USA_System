package com.usa.attendancesystem.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

/**
 * DTO representing a single student row from CSV import file.
 */
public record StudentCsvImportRequest(
        @NotBlank(message = "Full name is required")
        @Size(max = 255, message = "Full name must not exceed 255 characters")
        String fullName,
        @NotBlank(message = "Parent phone number is required")
        @Size(max = 20, message = "Parent phone must not exceed 20 characters")
        String parentPhone,
        @Size(max = 20, message = "Student phone must not exceed 20 characters")
        String studentPhone, // Optional

        @NotNull(message = "Batch year is required")
        Integer batchYear,
        @NotBlank(message = "Subject names are required")
        String subjectNames // Comma-separated subject names
        ) {

}
