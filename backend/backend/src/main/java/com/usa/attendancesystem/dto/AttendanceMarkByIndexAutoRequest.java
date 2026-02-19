package com.usa.attendancesystem.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record AttendanceMarkByIndexAutoRequest(
        @NotBlank(message = "Index number is required")
        @Size(max = 10, message = "Index number cannot exceed 10 characters")
        String indexNumber
) {
}
