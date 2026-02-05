package com.usa.attendancesystem.dto;

import java.time.Instant;
import java.util.UUID;

/**
 * DTO for fee report responses.
 */
public record FeeReportDto(
        UUID studentId,
        String studentIdCode,
        String studentName,
        String batchName,
        String subjectName,
        Integer month,
        Integer year,
        Boolean isPaid,
        String billNumber,
        Instant paidAt
        ) {

}
