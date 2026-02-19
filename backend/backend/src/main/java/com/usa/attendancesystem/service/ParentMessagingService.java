package com.usa.attendancesystem.service;

import java.time.LocalDate;
import java.util.List;
import java.util.stream.Collectors;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.usa.attendancesystem.dto.BroadcastMessageRequest;
import com.usa.attendancesystem.dto.MessagingStatsDto;
import com.usa.attendancesystem.dto.TargetedStudentCountDto;
import com.usa.attendancesystem.model.FeeExemptionType;
import com.usa.attendancesystem.model.Student;
import com.usa.attendancesystem.repository.FeeExemptionRepository;
import com.usa.attendancesystem.repository.FeePaymentRepository;
import com.usa.attendancesystem.repository.StudentRepository;

import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class ParentMessagingService {

    private final StudentRepository studentRepository;
    private final FeePaymentRepository feePaymentRepository;
    private final FeeExemptionRepository feeExemptionRepository;
    private final SmsService smsService;

    @Transactional(readOnly = true)
    public void sendBroadcastMessage(BroadcastMessageRequest request) {
        List<Student> targetStudents;

        if (request.batchId() == null && request.subjectId() == null) {
            // Send to all active students (excluding archived batches)
            targetStudents = studentRepository.findByIsActiveTrueAndBatchNotArchived();
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
        LocalDate currentDate = LocalDate.now();
        int currentMonth = currentDate.getMonthValue();
        int currentYear = currentDate.getYear();

        // Get all active students (excluding archived batches)
        List<Student> allActiveStudents = studentRepository.findByIsActiveTrueAndBatchNotArchived();

        // Filter students who haven't paid for current month and have valid parent phone
        List<Student> unpaidStudents = allActiveStudents.stream()
                .filter(student -> {
                    // Check if student has paid for current month
                    boolean hasPaid = feePaymentRepository.findByStudentAndMonthAndYear(
                            student.getId(), currentMonth, currentYear).isPresent();
                if (hasPaid) {
                return false;
                }

                // Only skip reminder if student has a FREE_CARD that applies to ALL subjects
                // If free card is only for some subjects, student should still receive fee reminder
                boolean hasFullFreeCard = feeExemptionRepository
                        .existsByStudentIdAndExemptionTypeAndAppliesToAllSubjects(
                                student.getId(), FeeExemptionType.FREE_CARD);

                return !hasFullFreeCard;
                })
                .filter(student -> student.getParentPhone() != null && !student.getParentPhone().trim().isEmpty())
                .collect(Collectors.toList());

        // Send reminders
        for (Student student : unpaidStudents) {
            // English message
            String englishMessage = String.format(
                    "Dear Parent, this is a reminder from USA that a fee payment for %s was due by %s and is now overdue. Please complete the payment within 2 days. Thank you.",
                    student.getFullName(),
                    currentDate.toString()
            );

            // Tamil message
            String tamilMessage = String.format(
                    "அன்புள்ள பெற்றோர், USA இலிருந்து %s என்ற மாணவர்/மாணவிக்கான கட்டணம் %s தேதிக்குள் செலுத்த வேண்டியிருந்தது. தயவுசெய்து விரைவில் கட்டணத்தை செலுத்தவும். நன்றி.",
                    student.getFullName(),
                    currentDate.toString()
            );

            // Send only English message (uncomment Tamil line if needed)
            smsService.sendSms(student.getParentPhone(), englishMessage);
            // smsService.sendSms(student.getParentPhone(), tamilMessage);
        }

        return unpaidStudents.size(); // Return count of students who received reminders
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
            // All active students (excluding archived batches)
            targetStudents = studentRepository.findByIsActiveTrueAndBatchNotArchived();
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
