package com.usa.attendancesystem.controller;

import java.util.List;
import java.util.UUID;

import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import com.usa.attendancesystem.dto.CreateStudentRequest;
import com.usa.attendancesystem.dto.CsvImportResultDto;
import com.usa.attendancesystem.dto.StudentDto;
import com.usa.attendancesystem.dto.UpdateStudentRequest;
import com.usa.attendancesystem.service.CsvImportService;
import com.usa.attendancesystem.service.StudentService;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/admin/students")
@RequiredArgsConstructor
public class StudentAdminController {

    private final StudentService studentService;
    private final CsvImportService csvImportService;

    @PostMapping
    public ResponseEntity<StudentDto> createStudent(@Valid @RequestBody CreateStudentRequest request) {
        StudentDto createdStudent = studentService.createStudent(request);
        return new ResponseEntity<>(createdStudent, HttpStatus.CREATED);
    }

    @GetMapping
    public ResponseEntity<List<StudentDto>> getStudents(
            @RequestParam(required = false) Integer batchId,
            @RequestParam(required = false) Integer subjectId) {

        List<StudentDto> students;

        // If no filters provided, return all active students
        if (batchId == null && subjectId == null) {
            students = studentService.getAllActiveStudents();
        } // If both filters provided, use both
        else if (batchId != null && subjectId != null) {
            students = studentService.getFilteredStudents(batchId, subjectId);
        } // If only batch filter provided
        else if (batchId != null) {
            students = studentService.getStudentsByBatch(batchId);
        } // If only subject filter provided
        else {
            students = studentService.getStudentsBySubject(subjectId);
        }

        return ResponseEntity.ok(students);
    }

    @GetMapping("/{studentId}")
    public ResponseEntity<StudentDto> getStudentById(@PathVariable UUID studentId) {
        StudentDto student = studentService.getStudentById(studentId);
        return ResponseEntity.ok(student);
    }

    @PutMapping("/{studentId}")
    public ResponseEntity<StudentDto> updateStudent(
            @PathVariable UUID studentId,
            @Valid @RequestBody UpdateStudentRequest request) {
        StudentDto updatedStudent = studentService.updateStudent(studentId, request);
        return ResponseEntity.ok(updatedStudent);
    }

    @PatchMapping("/{studentId}/deactivate")
    public ResponseEntity<Void> deactivateStudent(@PathVariable UUID studentId) {
        studentService.deactivateStudent(studentId);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/import-csv")
    public ResponseEntity<CsvImportResultDto> importStudentsFromCsv(
            @RequestParam("file") MultipartFile file) {

        // Validate file
        if (file.isEmpty()) {
            throw new IllegalArgumentException("Please select a file to upload");
        }

        String fileName = file.getOriginalFilename();
        if (fileName == null || !fileName.toLowerCase().endsWith(".csv")) {
            throw new IllegalArgumentException("Please upload a CSV file");
        }

        CsvImportResultDto result = csvImportService.importStudentsFromCsv(file);
        return ResponseEntity.ok(result);
    }

    @GetMapping("/csv-template")
    public ResponseEntity<String> downloadCsvTemplate() {
        String csvContent = csvImportService.generateCsvTemplate();

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.parseMediaType("text/csv"));
        headers.setContentDispositionFormData("attachment", "student-import-template.csv");

        return ResponseEntity.ok()
                .headers(headers)
                .body(csvContent);
    }

    @GetMapping("/excel-template")
    public ResponseEntity<byte[]> downloadExcelTemplate() {
        byte[] excelContent = csvImportService.generateExcelTemplate();

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.parseMediaType("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"));
        headers.setContentDispositionFormData("attachment", "student-import-template.xlsx");

        return ResponseEntity.ok()
                .headers(headers)
                .body(excelContent);
    }

    @GetMapping("/all")
    public ResponseEntity<List<StudentDto>> getAllActiveStudents() {
        System.out.println("StudentAdminController - getAllActiveStudents() called");
        try {
            List<StudentDto> students = studentService.getAllActiveStudents();
            System.out.println("StudentAdminController - Found " + students.size() + " students");
            return ResponseEntity.ok(students);
        } catch (Exception e) {
            System.out.println("StudentAdminController - Error in getAllActiveStudents: " + e.getMessage());
            e.printStackTrace();
            throw e;
        }
    }

    @DeleteMapping("/{studentId}")
    public ResponseEntity<Void> deleteStudent(@PathVariable UUID studentId) {
        System.out.println("StudentAdminController - deleteStudent() called for ID: " + studentId);
        try {
            studentService.deleteStudent(studentId);
            System.out.println("StudentAdminController - Student deleted successfully");
            return ResponseEntity.noContent().build();
        } catch (Exception e) {
            System.out.println("StudentAdminController - Error in deleteStudent: " + e.getMessage());
            e.printStackTrace();
            throw e;
        }
    }

    @GetMapping("/next-student-id")
    public ResponseEntity<String> getNextStudentIdCode() {
        String nextStudentId = studentService.getNextStudentIdCode();
        return ResponseEntity.ok(nextStudentId);
    }
}
