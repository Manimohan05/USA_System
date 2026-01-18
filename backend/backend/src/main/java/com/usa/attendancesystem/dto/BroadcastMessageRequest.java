package com.usa.attendancesystem.dto;

import jakarta.validation.constraints.NotBlank;

/**
 * DTO for sending a broadcast message to a targeted group of parents.
 */
public record BroadcastMessageRequest(
        Integer batchId, // Optional: if null, send to all batches
        Integer subjectId, // Optional: if null, send to all subjects
        @NotBlank
        String message
        ) {

}
