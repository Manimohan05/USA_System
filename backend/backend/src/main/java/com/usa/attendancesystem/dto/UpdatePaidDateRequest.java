package com.usa.attendancesystem.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import java.time.Instant;

/**
 * DTO for updating the paid date of an existing fee payment.
 */
public record UpdatePaidDateRequest(
        @NotBlank String studentIdCode,
        @NotNull @Positive Integer month,
        @NotNull @Positive Integer year,
        @NotNull Instant paidAt
) {}
