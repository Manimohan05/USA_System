package com.usa.attendancesystem.dto;

import java.util.List;

import com.usa.attendancesystem.model.FeeExemptionType;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

public record FeeExemptionRequest(
        @NotBlank(message = "Student ID code is required")
        String studentIdCode,
        @NotNull(message = "Exemption type is required")
        FeeExemptionType exemptionType,
        Boolean appliesToAllSubjects,
        List<Integer> subjectIds
) {
}
