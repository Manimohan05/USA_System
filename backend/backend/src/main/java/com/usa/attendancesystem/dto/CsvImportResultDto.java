package com.usa.attendancesystem.dto;

import java.util.List;

/**
 * DTO for CSV import operation results.
 */
public record CsvImportResultDto(
        int totalRows,
        int successfulImports,
        int failedImports,
        List<String> errors,
        List<StudentDto> importedStudents
        ) {

}
