package com.usa.attendancesystem.service;

import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.usa.attendancesystem.dto.FeeExemptionDto;
import com.usa.attendancesystem.dto.FeeExemptionRequest;
import com.usa.attendancesystem.dto.FeePaymentRequest;
import com.usa.attendancesystem.dto.FeeReportDto;
import com.usa.attendancesystem.dto.FeeReportRequest;
import com.usa.attendancesystem.dto.SubjectDto;
import com.usa.attendancesystem.dto.UpdateBillRequest;
import com.usa.attendancesystem.dto.UpdatePaidDateRequest;
import com.usa.attendancesystem.exception.DuplicateResourceException;
import com.usa.attendancesystem.model.FeeExemption;
import com.usa.attendancesystem.model.FeeExemptionType;
import com.usa.attendancesystem.exception.ResourceNotFoundException;
import com.usa.attendancesystem.model.FeePayment;
import com.usa.attendancesystem.model.Student;
import com.usa.attendancesystem.model.Subject;
import com.usa.attendancesystem.repository.FeeExemptionRepository;
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
        private final FeeExemptionRepository feeExemptionRepository;
    
    private final StudentRepository studentRepository;
    private final SubjectRepository subjectRepository;

        @Transactional
        public FeeExemptionDto addFeeExemption(FeeExemptionRequest request) {
                Student student = studentRepository.findByStudentIdCodeWithSubjects(request.studentIdCode().trim())
                                .orElseThrow(() -> new ResourceNotFoundException(
                                "Student not found with ID: " + request.studentIdCode()));

                if (!student.isActive()) {
                        throw new IllegalStateException("Student account is not active");
                }

                Optional<FeeExemption> existingExemption = feeExemptionRepository.findByStudentId(student.getId());

                if (existingExemption.isPresent()) {
                        throw new DuplicateResourceException("Student already has a fee exemption. Remove it first to change type.");
                }

                boolean appliesToAllSubjects = Boolean.TRUE.equals(request.appliesToAllSubjects());
                List<Integer> subjectIds = request.subjectIds() == null ? List.of() : request.subjectIds();
                Set<Subject> selectedSubjects = new HashSet<>();

                if (request.exemptionType() == FeeExemptionType.ALARM_EXEMPTION) {
                        appliesToAllSubjects = true;
                } else {
                        if (appliesToAllSubjects) {
                                subjectIds = List.of();
                        } else {
                                if (subjectIds.isEmpty()) {
                                        throw new IllegalArgumentException("Select at least one enrolled subject for this exemption.");
                                }

                                Map<Integer, Subject> subjectMap = student.getSubjects().stream()
                                                .collect(Collectors.toMap(Subject::getId, subject -> subject));

                                List<Integer> invalidSubjectIds = subjectIds.stream()
                                                .filter(subjectId -> !subjectMap.containsKey(subjectId))
                                                .toList();

                                if (!invalidSubjectIds.isEmpty()) {
                                        throw new IllegalArgumentException("Selected subjects are not enrolled by this student.");
                                }

                                selectedSubjects = subjectIds.stream()
                                                .map(subjectMap::get)
                                                .collect(Collectors.toSet());
                        }
                }

                FeeExemption savedExemption = feeExemptionRepository.save(
                                new FeeExemption(student, request.exemptionType(), appliesToAllSubjects, selectedSubjects));

                return new FeeExemptionDto(
                                savedExemption.getId(),
                                student.getId(),
                                student.getStudentIdCode(),
                                student.getFullName(),
                                savedExemption.getExemptionType(),
                                savedExemption.isAppliesToAllSubjects(),
                                savedExemption.getSubjects().stream()
                                                .map(subject -> new SubjectDto(subject.getId(), subject.getName(), null))
                                                .toList(),
                                savedExemption.getCreatedAt()
                );
        }

        @Transactional(readOnly = true)
        public List<SubjectDto> getEnrolledSubjects(String studentIdCode) {
                Student student = studentRepository.findByStudentIdCodeWithSubjects(studentIdCode.trim())
                                .orElseThrow(() -> new ResourceNotFoundException(
                                "Student not found with ID: " + studentIdCode));

                if (!student.isActive()) {
                        throw new IllegalStateException("Student account is not active");
                }

                return student.getSubjects().stream()
                                .map(subject -> new SubjectDto(subject.getId(), subject.getName(), null))
                                .toList();
        }

        @Transactional(readOnly = true)
        public List<FeeExemptionDto> getFeeExemptions() {
                return feeExemptionRepository.findAllWithStudents().stream()
                                .map(exemption -> new FeeExemptionDto(
                                exemption.getId(),
                                exemption.getStudent().getId(),
                                exemption.getStudent().getStudentIdCode(),
                                exemption.getStudent().getFullName(),
                                exemption.getExemptionType(),
                                exemption.isAppliesToAllSubjects(),
                                exemption.getSubjects().stream()
                                                .map(subject -> new SubjectDto(subject.getId(), subject.getName(), null))
                                                .toList(),
                                exemption.getCreatedAt()
                ))
                                .toList();
        }

        @Transactional
        public void removeFeeExemption(UUID exemptionId) {
                FeeExemption exemption = feeExemptionRepository.findById(exemptionId)
                                .orElseThrow(() -> new ResourceNotFoundException("Fee exemption not found"));
                feeExemptionRepository.delete(exemption);
        }

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

        List<UUID> studentIds = students.stream()
                .map(Student::getId)
                .toList();

        Map<UUID, FeeExemption> exemptionMap = studentIds.isEmpty()
                ? Map.of()
                : feeExemptionRepository.findByStudentIdIn(studentIds).stream()
                        .collect(Collectors.toMap(
                                exemption -> exemption.getStudent().getId(),
                                exemption -> exemption));

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
                                        FeeExemption exemption = exemptionMap.get(student.getId());
                                        FeeExemptionType exemptionType = null;
                                        boolean exemptionApplies = false;

                                        if (exemption != null) {
                                                exemptionType = exemption.getExemptionType();
                                                if (exemptionType == FeeExemptionType.FREE_CARD || exemptionType == FeeExemptionType.HALF_PAYMENT) {
                                                        exemptionApplies = exemption.isAppliesToAllSubjects()
                                                                        || exemption.getSubjects().stream().anyMatch(s -> s.getId().equals(request.subjectId()));
                                                }
                                        }

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
                                                        payment != null ? payment.getPaidAt() : null,
                                                        exemptionType,
                                                        exemptionApplies
                    ));
                }
            }
        } else {
            // Show general fee status per student
            for (Student student : students) {
                FeePayment payment = paymentMap.get(student.getId().toString());
                                FeeExemption exemption = exemptionMap.get(student.getId());
                                FeeExemptionType exemptionType = null;
                                boolean exemptionApplies = false;

                                if (exemption != null) {
                                        exemptionType = exemption.getExemptionType();
                                        if (exemptionType == FeeExemptionType.FREE_CARD || exemptionType == FeeExemptionType.HALF_PAYMENT) {
                                                exemptionApplies = exemption.isAppliesToAllSubjects();
                                        }
                                }

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
                                                payment != null ? payment.getPaidAt() : null,
                                                exemptionType,
                                                exemptionApplies
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
