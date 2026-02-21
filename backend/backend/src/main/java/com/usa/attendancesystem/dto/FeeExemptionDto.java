package com.usa.attendancesystem.dto;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

import com.usa.attendancesystem.model.FeeExemptionType;

public record FeeExemptionDto(
        UUID id,
        UUID studentId,
        String studentIdCode,
        String fullName,
        String nic,
        FeeExemptionType exemptionType,
        Boolean appliesToAllSubjects,
        List<SubjectDto> subjects,
        Instant createdAt
) {
}
