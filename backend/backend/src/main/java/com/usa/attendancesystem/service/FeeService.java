package com.usa.attendancesystem.service;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.stream.Collectors;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.usa.attendancesystem.dto.FeePaymentRequest;
import com.usa.attendancesystem.dto.FeeReportDto;
import com.usa.attendancesystem.dto.FeeReportRequest;
import com.usa.attendancesystem.dto.UpdateBillRequest;
import com.usa.attendancesystem.dto.UpdatePaidDateRequest;
import com.usa.attendancesystem.exception.DuplicateResourceException;
import com.usa.attendancesystem.exception.ResourceNotFoundException;
import com.usa.attendancesystem.model.FeePayment;
import com.usa.attendancesystem.model.Student;
import com.usa.attendancesystem.model.Subject;
import com.usa.attendancesystem.repository.FeePaymentRepository;
import com.usa.attendancesystem.repository.StudentRepository;
import com.usa.attendancesystem.repository.SubjectRepository;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

@Service
@RequiredArgsConstructor
@Slf4j
public class FeeService {

    private final FeePaymentRepository feePaymentRepository;
    private final StudentRepository studentRepository;
    private final SubjectRepository subjectRepository;

    @Transactional
    public void markFeePayment(FeePaymentRequest request) {
        log.info("Processing fee payment for student: {} for {}/{}",
                request.studentIdCode(), request.month(), request.year());

        // Find and validate student (since student ID code and index numbers are the same, use either method)
        Student student = studentRepository.findByStudentIdCode(request.studentIdCode())
                .orElseThrow(() -> new ResourceNotFoundException(
                "Student not found with ID: " + request.studentIdCode()));

        if (!student.isActive()) {
            throw new IllegalStateException("Student account is not active");
        }

        // Check for existing payment
        Optional<FeePayment> existingPayment = feePaymentRepository.findByStudentAndMonthAndYear(
                student.getId(), request.month(), request.year());

        if (existingPayment.isPresent()) {
            throw new DuplicateResourceException(
                    String.format("Fee payment already exists for %s for %s/%s (Bill: %s)",
                            student.getFullName(), request.month(), request.year(),
                            existingPayment.get().getBillNumber()));
        }

        // Create and save fee payment
        FeePayment feePayment = new FeePayment(student, request.billNumber(),
                request.month(), request.year());

        feePaymentRepository.save(feePayment);

        log.info("Fee payment marked successfully for student: {} ({})",
                student.getFullName(), request.studentIdCode());
    }

    @Transactional(readOnly = true)
    public List<FeeReportDto> generateFeeReport(FeeReportRequest request) {
        log.info("Generating fee report for {}/{} with filters - batch: {}, subject: {}, student: {}",
                request.month(), request.year(), request.batchId(), request.subjectId(), request.studentIdCode());

        // Get all students that match the filter criteria
        List<Student> students = feePaymentRepository.findStudentsForFeeReport(
                request.batchId(), request.subjectId(), request.studentIdCode());

        // Get all fee payments for the month/year with the same filters
        List<FeePayment> feePayments = feePaymentRepository.findFeePaymentsByFilters(
                request.month(), request.year(), request.batchId(),
                request.subjectId(), request.studentIdCode());

        // Create a map of student ID to fee payment for quick lookup
        Map<String, FeePayment> paymentMap = feePayments.stream()
                .collect(Collectors.toMap(
                        fp -> fp.getStudent().getId().toString(),
                        fp -> fp));

        List<FeeReportDto> reportDtos = new ArrayList<>();

        // If filtering by subject, we need to show records per student-subject combination
        if (request.subjectId() != null) {
            Subject subject = subjectRepository.findById(request.subjectId())
                    .orElseThrow(() -> new ResourceNotFoundException("Subject not found"));

            for (Student student : students) {
                // Only include students enrolled in the subject
                if (student.getSubjects().stream().anyMatch(s -> s.getId().equals(request.subjectId()))) {
                    FeePayment payment = paymentMap.get(student.getId().toString());

                    reportDtos.add(new FeeReportDto(
                            student.getId(),
                            student.getStudentIdCode(),
                            student.getFullName(),
                            String.valueOf(student.getBatch().getBatchYear()),
                            subject.getName(),
                            request.month(),
                            request.year(),
                            payment != null,
                            payment != null ? payment.getBillNumber() : null,
                            payment != null ? payment.getPaidAt() : null
                    ));
                }
            }
        } else {
            // Show general fee status per student
            for (Student student : students) {
                FeePayment payment = paymentMap.get(student.getId().toString());

                reportDtos.add(new FeeReportDto(
                        student.getId(),
                        student.getStudentIdCode(),
                        student.getFullName(),
                        String.valueOf(student.getBatch().getBatchYear()),
                        "General Fee", // Generic subject when not filtering by subject
                        request.month(),
                        request.year(),
                        payment != null,
                        payment != null ? payment.getBillNumber() : null,
                        payment != null ? payment.getPaidAt() : null
                ));
            }
        }

        log.info("Generated fee report with {} records", reportDtos.size());
        return reportDtos;
    }

        @Transactional
        public void updateBillNumber(UpdateBillRequest request) {
                log.info("Updating bill number for student {} for {}/{}", request.studentIdCode(), request.month(), request.year());

                Student student = studentRepository.findByStudentIdCode(request.studentIdCode())
                                .orElseThrow(() -> new ResourceNotFoundException("Student not found with ID: " + request.studentIdCode()));

                FeePayment payment = feePaymentRepository.findByStudentAndMonthAndYear(
                                student.getId(), request.month(), request.year())
                                .orElseThrow(() -> new ResourceNotFoundException("Fee payment not found for student for given month/year"));

                payment.setBillNumber(request.billNumber());
                feePaymentRepository.save(payment);

                log.info("Updated bill number to {} for student {}", request.billNumber(), request.studentIdCode());
        }

        @Transactional
        public void updatePaidDate(UpdatePaidDateRequest request) {
                log.info("Updating paid date for student {} for {}/{}", request.studentIdCode(), request.month(), request.year());

                Student student = studentRepository.findByStudentIdCode(request.studentIdCode())
                                .orElseThrow(() -> new ResourceNotFoundException("Student not found with ID: " + request.studentIdCode()));

                FeePayment payment = feePaymentRepository.findByStudentAndMonthAndYear(
                                student.getId(), request.month(), request.year())
                                .orElseThrow(() -> new ResourceNotFoundException("Fee payment not found for student for given month/year"));

                payment.setPaidAt(request.paidAt());
                feePaymentRepository.save(payment);

                log.info("Updated paid date to {} for student {}", request.paidAt(), request.studentIdCode());
        }
}
