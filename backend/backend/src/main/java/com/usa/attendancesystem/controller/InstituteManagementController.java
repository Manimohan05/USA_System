package com.usa.attendancesystem.controller;

import java.util.List;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.usa.attendancesystem.dto.BatchDto;
import com.usa.attendancesystem.dto.CreateBatchRequest;
import com.usa.attendancesystem.dto.CreateSubjectRequest;
import com.usa.attendancesystem.dto.SubjectDto;
import com.usa.attendancesystem.service.InstituteManagementService;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;

/**
 * REST Controller for managing institute-level resources like Batches and
 * Subjects. These endpoints will be protected by security rules.
 */
@RestController
@RequestMapping("/admin/institute")
@RequiredArgsConstructor
public class InstituteManagementController {

    private final InstituteManagementService instituteManagementService;

    // --- Batch Endpoints ---
    @PostMapping("/batches")
    public ResponseEntity<BatchDto> createBatch(@Valid @RequestBody CreateBatchRequest request) {
        BatchDto createdBatch = instituteManagementService.createBatch(request);
        return new ResponseEntity<>(createdBatch, HttpStatus.CREATED);
    }

    @GetMapping("/batches")
    public ResponseEntity<List<BatchDto>> getAllBatches() {
        System.out.println("InstituteManagementController - getAllBatches() called");
        try {
            List<BatchDto> batches = instituteManagementService.getAllBatches();
            System.out.println("InstituteManagementController - Found " + batches.size() + " batches");
            return ResponseEntity.ok(batches);
        } catch (Exception e) {
            System.out.println("InstituteManagementController - Error in getAllBatches: " + e.getMessage());
            e.printStackTrace();
            throw e;
        }
    }

    @PutMapping("/batches/{id}")
    public ResponseEntity<BatchDto> updateBatch(@PathVariable Integer id, @Valid @RequestBody CreateBatchRequest request) {
        System.out.println("InstituteManagementController - updateBatch() called for ID: " + id);
        try {
            BatchDto updatedBatch = instituteManagementService.updateBatch(id, request);
            System.out.println("InstituteManagementController - Batch updated successfully");
            return ResponseEntity.ok(updatedBatch);
        } catch (Exception e) {
            System.out.println("InstituteManagementController - Error in updateBatch: " + e.getMessage());
            e.printStackTrace();
            throw e;
        }
    }

    @DeleteMapping("/batches/{id}")
    public ResponseEntity<Void> deleteBatch(@PathVariable Integer id) {
        System.out.println("InstituteManagementController - deleteBatch() called for ID: " + id);
        try {
            instituteManagementService.deleteBatch(id);
            System.out.println("InstituteManagementController - Batch deleted successfully");
            return ResponseEntity.noContent().build();
        } catch (Exception e) {
            System.out.println("InstituteManagementController - Error in deleteBatch: " + e.getMessage());
            e.printStackTrace();
            throw e;
        }
    }

    // --- Subject Endpoints ---
    @PostMapping("/subjects")
    public ResponseEntity<SubjectDto> createSubject(@Valid @RequestBody CreateSubjectRequest request) {
        SubjectDto createdSubject = instituteManagementService.createSubject(request);
        return new ResponseEntity<>(createdSubject, HttpStatus.CREATED);
    }

    @GetMapping("/subjects")
    public ResponseEntity<List<SubjectDto>> getAllSubjects() {
        System.out.println("InstituteManagementController - getAllSubjects() called");
        try {
            List<SubjectDto> subjects = instituteManagementService.getAllSubjects();
            System.out.println("InstituteManagementController - Found " + subjects.size() + " subjects");
            return ResponseEntity.ok(subjects);
        } catch (Exception e) {
            System.out.println("InstituteManagementController - Error in getAllSubjects: " + e.getMessage());
            e.printStackTrace();
            throw e;
        }
    }

    @PutMapping("/subjects/{id}")
    public ResponseEntity<SubjectDto> updateSubject(@PathVariable Integer id, @Valid @RequestBody CreateSubjectRequest request) {
        System.out.println("InstituteManagementController - updateSubject() called for ID: " + id);
        try {
            SubjectDto updatedSubject = instituteManagementService.updateSubject(id, request);
            System.out.println("InstituteManagementController - Subject updated successfully");
            return ResponseEntity.ok(updatedSubject);
        } catch (Exception e) {
            System.out.println("InstituteManagementController - Error in updateSubject: " + e.getMessage());
            e.printStackTrace();
            throw e;
        }
    }

    @DeleteMapping("/subjects/{id}")
    public ResponseEntity<Void> deleteSubject(@PathVariable Integer id) {
        System.out.println("InstituteManagementController - deleteSubject() called for ID: " + id);
        try {
            instituteManagementService.deleteSubject(id);
            System.out.println("InstituteManagementController - Subject deleted successfully");
            return ResponseEntity.noContent().build();
        } catch (Exception e) {
            System.out.println("InstituteManagementController - Error in deleteSubject: " + e.getMessage());
            e.printStackTrace();
            throw e;
        }
    }
}
