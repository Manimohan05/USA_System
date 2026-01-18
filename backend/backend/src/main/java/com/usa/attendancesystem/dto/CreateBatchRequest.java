package com.usa.attendancesystem.dto;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;

/**
 * DTO for receiving a request to create a new Batch.
 * Includes validation rules.
 */
public record CreateBatchRequest(
    @NotNull(message = "Batch year cannot be null")
    @Min(value = 2020, message = "Batch year must be 2020 or later")
    @Max(value = 2050, message = "Batch year must be 2050 or earlier")
    int batchYear
) {}

