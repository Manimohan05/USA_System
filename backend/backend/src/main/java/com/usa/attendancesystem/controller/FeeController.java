package com.usa.attendancesystem.controller;

import java.util.List;
import java.util.UUID;

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

import com.usa.attendancesystem.dto.FeeExemptionDto;
import com.usa.attendancesystem.dto.FeeExemptionRequest;
import com.usa.attendancesystem.dto.FeePaymentRequest;
import com.usa.attendancesystem.dto.FeeReportDto;
import com.usa.attendancesystem.dto.FeeReportRequest;
import com.usa.attendancesystem.dto.SubjectDto;
import com.usa.attendancesystem.dto.UpdateBillRequest;
import com.usa.attendancesystem.dto.UpdatePaidDateRequest;
import com.usa.attendancesystem.service.FeeService;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

@RestController
@RequestMapping("/admin/fees")
@RequiredArgsConstructor
@Slf4j
public class FeeController {
    @DeleteMapping("/remove-payment")
    public ResponseEntity<String> removeFeePayment(@RequestBody FeePaymentRequest request) {
        feeService.removeFeePayment(request);
        return ResponseEntity.ok("Fee payment removed successfully");
    }

    private final FeeService feeService;

    @PostMapping("/mark-payment")
    public ResponseEntity<String> markFeePayment(@Valid @RequestBody FeePaymentRequest request) {

        log.info("Received fee payment request for student: {} for {}/{}",
                request.studentIdCode(), request.month(), request.year());

        try {
            feeService.markFeePayment(request);

            String message = String.format("Fee payment marked successfully for student %s for %s/%s",
                    request.studentIdCode(), request.month(), request.year());

            return ResponseEntity.status(HttpStatus.CREATED).body(message);

        } catch (Exception e) {
            log.error("Error marking fee payment for student {}: {}",
                    request.studentIdCode(), e.getMessage());
            throw e;
        }
    }

    @PostMapping("/report")
    public ResponseEntity<List<FeeReportDto>> generateFeeReport(@Valid @RequestBody FeeReportRequest request) {

        log.info("Generating fee report for {}/{} with filters - batch: {}, subject: {}, student: {}",
                request.month(), request.year(), request.batchId(),
                request.subjectId(), request.studentIdCode());

        try {
            List<FeeReportDto> report = feeService.generateFeeReport(request);

            log.info("Fee report generated successfully with {} records", report.size());
            return ResponseEntity.ok(report);

        } catch (Exception e) {
            log.error("Error generating fee report: {}", e.getMessage());
            throw e;
        }
    }

    @PutMapping("/update-bill")
    public ResponseEntity<String> updateBillNumber(@Valid @RequestBody UpdateBillRequest request) {
        log.info("Received request to update bill number for student {} for {}/{}",
                request.studentIdCode(), request.month(), request.year());

        try {
            feeService.updateBillNumber(request);
            return ResponseEntity.ok("Bill number updated successfully");
        } catch (Exception e) {
            log.error("Error updating bill number: {}", e.getMessage());
            throw e;
        }
    }

    @PutMapping("/update-paid-date")
    public ResponseEntity<String> updatePaidDate(@Valid @RequestBody UpdatePaidDateRequest request) {
        log.info("Received request to update paid date for student {} for {}/{}",
                request.studentIdCode(), request.month(), request.year());

        try {
            feeService.updatePaidDate(request);
            return ResponseEntity.ok("Paid date updated successfully");
        } catch (Exception e) {
            log.error("Error updating paid date: {}", e.getMessage());
            throw e;
        }
    }

    @PostMapping("/exemptions")
    public ResponseEntity<FeeExemptionDto> addFeeExemption(@Valid @RequestBody FeeExemptionRequest request) {
        FeeExemptionDto exemption = feeService.addFeeExemption(request);
        return ResponseEntity.status(HttpStatus.CREATED).body(exemption);
    }

    @GetMapping("/exemptions")
    public ResponseEntity<List<FeeExemptionDto>> getFeeExemptions() {
        return ResponseEntity.ok(feeService.getFeeExemptions());
    }

    @GetMapping("/exemptions/subjects/{studentIdCode}")
    public ResponseEntity<List<SubjectDto>> getExemptionSubjects(@PathVariable String studentIdCode) {
        return ResponseEntity.ok(feeService.getEnrolledSubjects(studentIdCode));
    }

    @DeleteMapping("/exemptions/{exemptionId}")
    public ResponseEntity<String> removeFeeExemption(@PathVariable UUID exemptionId) {
        feeService.removeFeeExemption(exemptionId);
        return ResponseEntity.ok("Fee exemption removed successfully");
    }
}
