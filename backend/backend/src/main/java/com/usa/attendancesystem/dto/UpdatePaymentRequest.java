package com.usa.attendancesystem.dto;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;

import java.math.BigDecimal;

/**
 * DTO for updating the payment status of a fee record.
 */
public record UpdatePaymentRequest(
    @NotNull @Positive BigDecimal amountPaid
) {}