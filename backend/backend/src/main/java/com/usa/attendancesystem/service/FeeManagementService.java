package com.usa.attendancesystem.service;

import com.usa.attendancesystem.dto.CreateFeeRecordRequest;
import com.usa.attendancesystem.dto.FeeRecordDto;
import com.usa.attendancesystem.dto.UpdatePaymentRequest;
import com.usa.attendancesystem.exception.ResourceNotFoundException;
import com.usa.attendancesystem.model.FeeRecord;
import com.usa.attendancesystem.model.FeeStatus;
import com.usa.attendancesystem.model.Student;
import com.usa.attendancesystem.repository.FeeRecordRepository;
import com.usa.attendancesystem.repository.StudentRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.time.LocalDate;

import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class FeeManagementService {

    private final FeeRecordRepository feeRecordRepository;
    private final StudentRepository studentRepository;

    @Transactional
    public FeeRecordDto createFeeRecord(CreateFeeRecordRequest request) {
        Student student = studentRepository.findById(request.studentId())
                .orElseThrow(() -> new ResourceNotFoundException("Student not found with ID: " + request.studentId()));

        FeeRecord feeRecord = new FeeRecord();
        feeRecord.setStudent(student);
        feeRecord.setAmountDue(request.amountDue());
        feeRecord.setAmountPaid(BigDecimal.ZERO);
        feeRecord.setDueDate(request.dueDate());
        feeRecord.setDescription(request.description());
        feeRecord.setStatus(FeeStatus.DUE);

        FeeRecord savedRecord = feeRecordRepository.save(feeRecord);
        return mapToDto(savedRecord);
    }

    @Transactional
    public FeeRecordDto updatePayment(Long feeId, UpdatePaymentRequest request) {
        FeeRecord feeRecord = feeRecordRepository.findById(feeId)
                .orElseThrow(() -> new ResourceNotFoundException("Fee record not found with ID: " + feeId));

        feeRecord.setAmountPaid(request.amountPaid());

        // Automatically update the status based on the payment
        if (feeRecord.getAmountPaid().compareTo(feeRecord.getAmountDue()) >= 0) {
            feeRecord.setStatus(FeeStatus.PAID);
        } else if (feeRecord.getAmountPaid().compareTo(BigDecimal.ZERO) > 0) {
            feeRecord.setStatus(FeeStatus.PARTIALLY_PAID);
        } else {
            feeRecord.setStatus(FeeStatus.DUE);
        }

        FeeRecord updatedRecord = feeRecordRepository.save(feeRecord);
        return mapToDto(updatedRecord);
    }

    @Transactional(readOnly = true)
    public List<FeeRecordDto> getFeesForStudent(UUID studentId) {
        return feeRecordRepository.findByStudentId(studentId).stream()
                .map(this::mapToDto)
                .collect(Collectors.toList());
    }

    // This method is used internally by the messaging service
    public List<FeeRecord> findOverdueFeeRecords() {
        List<FeeStatus> overdueStatuses = List.of(FeeStatus.DUE, FeeStatus.PARTIALLY_PAID, FeeStatus.OVERDUE);
        return feeRecordRepository.findOverdueFees(overdueStatuses, LocalDate.now());
    }

    private FeeRecordDto mapToDto(FeeRecord record) {
        return new FeeRecordDto(
                record.getId(),
                record.getStudent().getId(),
                record.getStudent().getFullName(),
                record.getAmountDue(),
                record.getAmountPaid(),
                record.getDueDate(),
                record.getStatus(),
                record.getDescription()
        );
    }
}