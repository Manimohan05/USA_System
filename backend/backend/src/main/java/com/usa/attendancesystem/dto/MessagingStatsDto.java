package com.usa.attendancesystem.dto;

/**
 * DTO for messaging statistics displayed in the messaging dashboard.
 */
public record MessagingStatsDto(
        long totalStudents,
        long parentContacts
        ) {

}
