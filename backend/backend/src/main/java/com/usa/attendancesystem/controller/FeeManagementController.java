package com.usa.attendancesystem.controller;

import java.util.List;
import java.util.UUID;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.usa.attendancesystem.dto.CreateFeeRecordRequest;
import com.usa.attendancesystem.dto.FeeRecordDto;
import com.usa.attendancesystem.dto.UpdatePaymentRequest;
import com.usa.attendancesystem.service.FeeManagementService;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/admin/fees")
@RequiredArgsConstructor
public class FeeManagementController {

    private final FeeManagementService feeManagementService;

    @PostMapping
    public ResponseEntity<FeeRecordDto> createFeeRecord(@Valid @RequestBody CreateFeeRecordRequest request) {
        FeeRecordDto createdRecord = feeManagementService.createFeeRecord(request);
        return new ResponseEntity<>(createdRecord, HttpStatus.CREATED);
    }

    @GetMapping("/student/{studentId}")
    public ResponseEntity<List<FeeRecordDto>> getFeesForStudent(@PathVariable UUID studentId) {
        List<FeeRecordDto> feeRecords = feeManagementService.getFeesForStudent(studentId);
        return ResponseEntity.ok(feeRecords);
    }

    @PutMapping("/{feeId}/payment")
    public ResponseEntity<FeeRecordDto> updatePayment(
            @PathVariable Long feeId,
            @Valid @RequestBody UpdatePaymentRequest request) {
        FeeRecordDto updatedRecord = feeManagementService.updatePayment(feeId, request);
        return ResponseEntity.ok(updatedRecord);
    }
}
