package com.usa.attendancesystem.dto;

import jakarta.validation.constraints.FutureOrPresent;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.Size;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.UUID;

/**
 * DTO for creating a new fee record for a student.
 */
public record CreateFeeRecordRequest(
    @NotNull UUID studentId,
    @NotNull @Positive BigDecimal amountDue,
    @NotNull @FutureOrPresent LocalDate dueDate,
    @Size(max = 255) String description
) {}