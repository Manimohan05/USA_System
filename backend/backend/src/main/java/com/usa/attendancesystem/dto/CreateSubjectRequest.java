package com.usa.attendancesystem.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/**
 * DTO for receiving a request to create a new Subject.
 * Includes validation rules.
 */
public record CreateSubjectRequest(
    @NotBlank(message = "Subject name cannot be blank")
    @Size(min = 2, max = 100, message = "Subject name must be between 2 and 50 characters")
    String name
) {}