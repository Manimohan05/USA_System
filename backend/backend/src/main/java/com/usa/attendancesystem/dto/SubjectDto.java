package com.usa.attendancesystem.dto;

/**
 * Data Transfer Object for sending Subject information to the client.
 */
public record SubjectDto(Integer id, String name, Long studentCount) {

}
