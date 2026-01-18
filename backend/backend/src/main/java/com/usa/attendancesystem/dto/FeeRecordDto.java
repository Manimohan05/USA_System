package com.usa.attendancesystem.dto;

import com.usa.attendancesystem.model.FeeStatus;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.UUID;

/**
 * DTO for displaying detailed information about a fee record.
 */
public record FeeRecordDto(
    Long id,
    UUID studentId,
    String studentName,
    BigDecimal amountDue,
    BigDecimal amountPaid,
    LocalDate dueDate,
    FeeStatus status,
    String description
) {}