package com.usa.attendancesystem.dto;

import java.time.LocalDate;

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
        @NotBlank(message = "Address is required")
        @Size(max = 500, message = "Address must not exceed 500 characters")
        String address,
        @Size(max = 15, message = "NIC must not exceed 15 characters")
        String nic, // Optional

        @NotBlank(message = "School is required")
        @Size(max = 255, message = "School must not exceed 255 characters")
        String school,
        @NotNull(message = "Admission date is required")
        LocalDate admissionDate,
        @NotBlank(message = "Phone number is required")
        @Size(max = 20, message = "Phone number must not exceed 20 characters")
        String phoneNumber,
        @NotNull(message = "Batch year is required")
        Integer batchYear,
        @NotNull(message = "Day batch flag is required")
        boolean isDayBatch,
        @NotBlank(message = "Subject names are required")
        String subjectNames // Comma-separated subject names
        ) {

}
