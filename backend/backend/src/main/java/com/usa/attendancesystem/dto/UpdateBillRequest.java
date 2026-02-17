package com.usa.attendancesystem.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;

/**
 * DTO for updating the bill number of an existing fee payment.
 */
public record UpdateBillRequest(
        @NotBlank String studentIdCode,
        @NotNull @Positive Integer month,
        @NotNull @Positive Integer year,
        @NotBlank String billNumber
) {}
