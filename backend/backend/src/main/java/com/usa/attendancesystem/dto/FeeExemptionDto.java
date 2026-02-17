package com.usa.attendancesystem.dto;

import java.time.Instant;
import java.util.UUID;

import com.usa.attendancesystem.model.FeeExemptionType;

public record FeeExemptionDto(
        UUID id,
        UUID studentId,
        String studentIdCode,
        String fullName,
        FeeExemptionType exemptionType,
        Instant createdAt
) {
}
