package com.usa.attendancesystem.dto;

/**
 * Data Transfer Object for sending Batch information to the client.
 */
public record BatchDto(Integer id, int batchYear, long studentCount) {

}
