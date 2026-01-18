package com.usa.attendancesystem.service;

import java.util.List;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.usa.attendancesystem.dto.BroadcastMessageRequest;
import com.usa.attendancesystem.dto.MessagingStatsDto;
import com.usa.attendancesystem.dto.TargetedStudentCountDto;
import com.usa.attendancesystem.model.FeeRecord;
import com.usa.attendancesystem.model.Student;
import com.usa.attendancesystem.repository.StudentRepository;

import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class ParentMessagingService {

    private final StudentRepository studentRepository;
    private final FeeManagementService feeManagementService;
    private final SmsService smsService;

    @Transactional(readOnly = true)
    public void sendBroadcastMessage(BroadcastMessageRequest request) {
        List<Student> targetStudents;

        if (request.batchId() == null && request.subjectId() == null) {
            // Send to all active students
            targetStudents = studentRepository.findByIsActiveTrue();
        } else if (request.batchId() != null && request.subjectId() != null) {
            // Send to specific batch and subject
            targetStudents = studentRepository.findActiveStudentsByBatchAndSubject(request.batchId(), request.subjectId());
        } else if (request.batchId() != null) {
            // Send to specific batch only
            targetStudents = studentRepository.findActiveStudentsByBatch(request.batchId());
        } else {
            // Send to specific subject only
            targetStudents = studentRepository.findActiveStudentsBySubject(request.subjectId());
        }

        for (Student student : targetStudents) {
            if (student.getParentPhone() != null && !student.getParentPhone().trim().isEmpty()) {
                smsService.sendSms(student.getParentPhone(), request.message());
            }
        }
    }

    @Transactional(readOnly = true)
    public int sendFeeReminders() {
        List<FeeRecord> overdueRecords = feeManagementService.findOverdueFeeRecords();

        for (FeeRecord record : overdueRecords) {
            Student student = record.getStudent();
            String message = String.format(
                    "Dear Parent, this is a friendly reminder that a fee payment of $%.2f for %s is overdue. Please complete the payment at your earliest convenience. Thank you.",
                    record.getAmountDue().subtract(record.getAmountPaid()),
                    student.getFullName()
            );
            smsService.sendSms(student.getParentPhone(), message);
        }
        return overdueRecords.size(); // Return the count of reminders sent
    }

    @Transactional(readOnly = true)
    public MessagingStatsDto getMessagingStats() {
        long totalStudents = studentRepository.countByIsActiveTrue();
        long parentContacts = studentRepository.countActiveStudentsWithParentPhone();
        return new MessagingStatsDto(totalStudents, parentContacts);
    }

    @Transactional(readOnly = true)
    public TargetedStudentCountDto getTargetedStudentCount(Integer batchId, Integer subjectId) {
        List<Student> targetStudents;

        if (batchId == null && subjectId == null) {
            // All active students
            targetStudents = studentRepository.findByIsActiveTrue();
        } else if (batchId != null && subjectId != null) {
            // Specific batch and subject
            targetStudents = studentRepository.findActiveStudentsByBatchAndSubject(batchId, subjectId);
        } else if (batchId != null) {
            // Specific batch only
            targetStudents = studentRepository.findActiveStudentsByBatch(batchId);
        } else {
            // Specific subject only
            targetStudents = studentRepository.findActiveStudentsBySubject(subjectId);
        }

        long studentCount = targetStudents.size();
        long parentContactCount = targetStudents.stream()
                .filter(student -> student.getParentPhone() != null && !student.getParentPhone().trim().isEmpty())
                .count();

        return new TargetedStudentCountDto(studentCount, parentContactCount);
    }
}
