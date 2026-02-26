package com.usa.attendancesystem.service;

import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.time.ZonedDateTime;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.usa.attendancesystem.dto.AttendanceMarkByIndexRequest;
import com.usa.attendancesystem.dto.AttendanceMarkByIndexAutoRequest;
import com.usa.attendancesystem.dto.AttendanceMarkRequest;
import com.usa.attendancesystem.dto.AttendanceRecordDto;
import com.usa.attendancesystem.dto.AttendanceReportDto;
import com.usa.attendancesystem.dto.AttendanceReportRequest;
import com.usa.attendancesystem.dto.AttendanceValidationResponseDto;
import com.usa.attendancesystem.dto.EnhancedAttendanceReportDto;
import com.usa.attendancesystem.dto.PresentStudentDto;
import com.usa.attendancesystem.dto.SessionAttendanceStatusDto;
import com.usa.attendancesystem.dto.StudentDto;
import com.usa.attendancesystem.exception.DuplicateResourceException;
import com.usa.attendancesystem.exception.ResourceNotFoundException;
import com.usa.attendancesystem.model.AttendanceRecord;
import com.usa.attendancesystem.model.AttendanceSession;
import com.usa.attendancesystem.model.FeeExemption;
import com.usa.attendancesystem.model.FeeExemptionType;
import com.usa.attendancesystem.model.Student;
import com.usa.attendancesystem.model.Subject;
import com.usa.attendancesystem.repository.AttendanceRecordRepository;
import com.usa.attendancesystem.repository.AttendanceSessionRepository;
import com.usa.attendancesystem.repository.FeeExemptionRepository;
import com.usa.attendancesystem.repository.FeePaymentRepository;
import com.usa.attendancesystem.repository.StudentRepository;
import com.usa.attendancesystem.repository.SubjectRepository;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

@Service
@RequiredArgsConstructor
@Slf4j
public class AttendanceService {

    private final StudentRepository studentRepository;
    private final SubjectRepository subjectRepository;
    private final AttendanceRecordRepository attendanceRepository;
    private final AttendanceSessionRepository sessionRepository;
    private final FeePaymentRepository feePaymentRepository;
    private final FeeExemptionRepository feeExemptionRepository;
    private final SmsService smsService;
    private final StudentService studentService; // Re-use the mapper from StudentService

    @Transactional
    public void markAttendance(AttendanceMarkRequest request) {
        // 1. Find student and subject
        Student student = studentRepository.findByStudentIdCode(request.studentIdCode())
                .orElseThrow(() -> new ResourceNotFoundException("Student with ID code '" + request.studentIdCode() + "' not found."));

        Subject subject = subjectRepository.findById(request.subjectId())
                .orElseThrow(() -> new ResourceNotFoundException("Subject not found with ID: " + request.subjectId()));

        // 2. Perform validations
        if (!student.isActive()) {
            throw new IllegalStateException("Student account is not active.");
        }

        // FIX: Changed '!=' to '.equals()' for safe object comparison.
        if (!student.getBatch().getId().equals(request.batchId())) {
            throw new IllegalStateException("Student is not enrolled in the selected batch.");
        }

        boolean isEnrolledInSubject = student.getSubjects().stream().anyMatch(s -> s.getId().equals(request.subjectId()));
        if (!isEnrolledInSubject) {
            throw new IllegalStateException("Student is not enrolled in the selected subject.");
        }

        // 3. Check for duplicate attendance - use system timezone for accurate day boundaries
        ZoneId zoneId = ZoneId.systemDefault();
        Instant startOfDay = LocalDate.now().atStartOfDay(zoneId).toInstant();
        Instant endOfDay = LocalDate.now().plusDays(1).atStartOfDay(zoneId).toInstant();
        if (attendanceRepository.hasStudentMarkedAttendanceToday(student.getId(), subject.getId(), startOfDay, endOfDay)) {
            throw new DuplicateResourceException("Attendance already marked for this student today.");
        }

        // 4. Create and save the record
        Instant attendanceTime = Instant.now();
        LocalDate attendanceDate = LocalDate.now();
        try {
            AttendanceRecord record = new AttendanceRecord();
            record.setStudent(student);
            record.setSubject(subject);
            record.setAttendanceTimestamp(attendanceTime);
            record.setAttendanceDate(attendanceDate);
            attendanceRepository.save(record);
            attendanceRepository.flush(); // Force immediate constraint check
        } catch (org.springframework.dao.DataIntegrityViolationException e) {
            log.warn("Duplicate attendance prevented by database constraint for student: {}", student.getStudentIdCode());
            throw new DuplicateResourceException("Attendance already marked for this student today.");
        }

        // 5. SMS notification for attendance marking is disabled
        // (only absence notifications are sent when sessions end)
    }

    @Transactional
    public AttendanceValidationResponseDto markAttendanceByIndexWithValidation(AttendanceMarkByIndexRequest request) {
        log.info("Starting attendance validation for sessionId: {} and indexNumber: '{}'",
                request.sessionId(), request.indexNumber());
        try {
            markAttendanceByIndex(request);

            // Find the student and return success response
            Student student = studentRepository.findByIndexNumberIgnoreCase(request.indexNumber().trim())
                    .orElseThrow(() -> new ResourceNotFoundException("Student not found"));

            StudentDto studentDto = studentService.mapToStudentDto(student);

            // Check fee payment status - use the same logic as session status
            AttendanceSession session = sessionRepository.findActiveSessionById(request.sessionId())
                    .orElseThrow(() -> new ResourceNotFoundException("Active session not found"));
            LocalDate sessionDate = session.getSessionDate();
            int month = sessionDate.getMonthValue();
            int year = sessionDate.getYear();

            // Convert session date to end of day (23:59:59) for payment check
            Instant endOfSessionDay = sessionDate.plusDays(1).atStartOfDay(ZoneId.systemDefault()).toInstant();

            boolean hasPaidFees = feePaymentRepository.hasStudentPaidFeesByDate(
                    student.getId(),
                    month,
                    year,
                    endOfSessionDay
            );

                List<FeeExemption> feeExemptions = feeExemptionRepository.findByStudentId(student.getId());
                boolean isAlarmExemption = feeExemptions.stream()
                    .anyMatch(exemption -> exemption.getExemptionType() == FeeExemptionType.ALARM_EXEMPTION);
                boolean isFreeCard = feeExemption
                    .map(exemption -> exemption.getExemptionType() == FeeExemptionType.FREE_CARD
                        && exemption.isAppliesToAllSubjects())
                    .orElse(false);

                boolean hasFeePaymentIssue = !hasPaidFees && !isFreeCard;
                boolean playFeeDueSound = !hasPaidFees && !isAlarmExemption && !isFreeCard;

            return AttendanceValidationResponseDto.success(
                    "Attendance marked successfully for " + student.getFullName(),
                    studentDto,
                    Instant.now(),
                    hasFeePaymentIssue,
                    playFeeDueSound
            );
        } catch (ResourceNotFoundException e) {
            if (e.getMessage().contains("Student with index number")) {
                return AttendanceValidationResponseDto.error(
                        "Student ID not found. Please check your ID and try again.",
                        "STUDENT_NOT_FOUND"
                );
            } else if (e.getMessage().contains("Active session not found")) {
                return AttendanceValidationResponseDto.error(
                        "No active session found. Please contact your instructor.",
                        "SESSION_NOT_FOUND"
                );
            } else {
                return AttendanceValidationResponseDto.error(
                        "Resource not found: " + e.getMessage(),
                        "RESOURCE_NOT_FOUND"
                );
            }
        } catch (DuplicateResourceException e) {
            // Find the student and their previous attendance record
            try {
                Student student = studentRepository.findByIndexNumberIgnoreCase(request.indexNumber().trim()).orElse(null);
                if (student != null) {
                    AttendanceSession session = sessionRepository.findActiveSessionById(request.sessionId()).orElse(null);
                    if (session != null) {
                        // Use system timezone for consistent day boundary calculation
                        ZoneId zoneId = ZoneId.systemDefault();
                        Instant startOfDay = session.getSessionDate().atStartOfDay(zoneId).toInstant();
                        Instant endOfDay = session.getSessionDate().plusDays(1).atStartOfDay(zoneId).toInstant();

                        Optional<AttendanceRecord> existingRecord = attendanceRepository.findStudentAttendanceToday(
                                student.getId(), session.getSubject().getId(), startOfDay, endOfDay);

                        StudentDto studentDto = studentService.mapToStudentDto(student);
                        if (existingRecord.isPresent()) {
                            return AttendanceValidationResponseDto.alreadyMarked(
                                    "Attendance already marked for " + student.getFullName() + " at "
                                    + ZonedDateTime.ofInstant(existingRecord.get().getAttendanceTimestamp(), zoneId)
                                            .format(DateTimeFormatter.ofPattern("hh:mm a")),
                                    studentDto,
                                    existingRecord.get().getAttendanceTimestamp()
                            );
                        }
                    }
                }
            } catch (Exception ignored) {
                // Fallback to generic message if we can't get details
            }
            return AttendanceValidationResponseDto.error(
                    "Attendance already marked for today.",
                    "ALREADY_MARKED"
            );
        } catch (IllegalStateException e) {
            String errorCode = "VALIDATION_ERROR";
            if (e.getMessage().contains("not active")) {
                errorCode = "STUDENT_INACTIVE";
            } else if (e.getMessage().contains("not enrolled in this session's batch")) {
                errorCode = "WRONG_BATCH";
            } else if (e.getMessage().contains("not enrolled in this session's subject")) {
                errorCode = "WRONG_SUBJECT";
            }
            return AttendanceValidationResponseDto.error(e.getMessage(), errorCode);
        } catch (Exception e) {
            log.error("Unexpected error during attendance marking", e);
            return AttendanceValidationResponseDto.error(
                    "An unexpected error occurred. Please try again.",
                    "SYSTEM_ERROR"
            );
        }
    }

        @Transactional
        public AttendanceValidationResponseDto markAttendanceByIndexAutoWithValidation(AttendanceMarkByIndexAutoRequest request) {
        String normalizedIndex = request.indexNumber() == null ? "" : request.indexNumber().trim().toUpperCase();
        if (normalizedIndex.isEmpty()) {
            return AttendanceValidationResponseDto.error("Please enter your Index Number.", "EMPTY_INPUT");
        }

        Student student = studentRepository.findByIndexNumberIgnoreCase(normalizedIndex)
            .orElse(null);

        if (student == null) {
            return AttendanceValidationResponseDto.error(
                "Student ID not found. Please check your ID and try again.",
                "STUDENT_NOT_FOUND"
            );
        }

        if (!student.isActive()) {
            return AttendanceValidationResponseDto.error("Student account is not active.", "STUDENT_INACTIVE");
        }

        Set<Integer> studentSubjectIds = student.getSubjects().stream()
            .map(Subject::getId)
            .collect(Collectors.toSet());

        List<AttendanceSession> matchingSessions = sessionRepository.findAllActiveSessions().stream()
            .filter(session -> session.getBatch().getId().equals(student.getBatch().getId()))
            .filter(session -> studentSubjectIds.contains(session.getSubject().getId()))
            .toList();

        if (matchingSessions.isEmpty()) {
            return AttendanceValidationResponseDto.error(
                "No active session found for this student. Please ask staff to open the correct batch/subject session.",
                "SESSION_NOT_FOUND"
            );
        }

        if (matchingSessions.size() > 1) {
            String sessionSummary = matchingSessions.stream()
                .map(s -> String.format("%s - %s", s.getBatch().getDisplayName(), s.getSubject().getName()))
                .collect(Collectors.joining(", "));

            return AttendanceValidationResponseDto.error(
                "Multiple active sessions match this student (" + sessionSummary
                    + "). Please use individual session marking for now.",
                "MULTIPLE_MATCHING_SESSIONS"
            );
        }

        AttendanceSession resolvedSession = matchingSessions.get(0);
        AttendanceValidationResponseDto result = markAttendanceByIndexWithValidation(
            new AttendanceMarkByIndexRequest(normalizedIndex, resolvedSession.getId())
        );

        if (result.success()) {
            return new AttendanceValidationResponseDto(
                true,
                result.message() + " (Session: " + resolvedSession.getBatch().getDisplayName() + " - "
                    + resolvedSession.getSubject().getName() + ", Session ID: " + resolvedSession.getId() + ")",
                result.errorCode(),
                result.student(),
                result.markedAt(),
                result.hasFeePaymentIssue(),
                result.playFeeDueSound()
            );
        }

        return result;
        }

    @Transactional(isolation = org.springframework.transaction.annotation.Isolation.READ_COMMITTED)
    public void markAttendanceByIndex(AttendanceMarkByIndexRequest request) {
        // 1. Find and validate active session
        AttendanceSession session = sessionRepository.findActiveSessionById(request.sessionId())
                .orElseThrow(() -> new ResourceNotFoundException("Active session not found with ID: " + request.sessionId()));

        // 2. Find student by index number
        log.info("Looking for student with index number: '{}'", request.indexNumber().trim().toUpperCase());
        Student student = studentRepository.findByIndexNumberIgnoreCase(request.indexNumber().trim())
                .orElseThrow(() -> {
                    log.warn("Student not found with index number: '{}' (case-insensitive search)", request.indexNumber().trim());
                    return new ResourceNotFoundException("Student with index number '" + request.indexNumber() + "' not found.");
                });

        // 3. Perform validations
        if (!student.isActive()) {
            throw new IllegalStateException("Student account is not active.");
        }

        // Validate student belongs to session batch
        if (!student.getBatch().getId().equals(session.getBatch().getId())) {
            throw new IllegalStateException("Student is not enrolled in this session's batch.");
        }

        // Validate student is enrolled in session subject
        boolean isEnrolledInSubject = student.getSubjects().stream()
                .anyMatch(s -> s.getId().equals(session.getSubject().getId()));
        if (!isEnrolledInSubject) {
            throw new IllegalStateException("Student is not enrolled in this session's subject.");
        }

        // 4. Check for duplicate attendance for this session date
        // Use system default timezone for accurate day boundary calculation
        ZoneId zoneId = ZoneId.systemDefault();
        Instant startOfDay = session.getSessionDate().atStartOfDay(zoneId).toInstant();
        Instant endOfDay = session.getSessionDate().plusDays(1).atStartOfDay(zoneId).toInstant();

        // Check if already marked (application-level check)
        if (attendanceRepository.hasStudentMarkedAttendanceToday(student.getId(), session.getSubject().getId(), startOfDay, endOfDay)) {
            throw new DuplicateResourceException("Attendance already marked for this student today in " + session.getSubject().getName());
        }

        // 5. Create and save the record
        // The database unique constraint will also prevent duplicates in case of race conditions
        AttendanceRecord record;
        Instant attendanceTime = Instant.now();
        LocalDate attendanceDate = session.getSessionDate(); // Use session date for consistency
        try {
            record = new AttendanceRecord();
            record.setStudent(student);
            record.setSubject(session.getSubject());
            record.setAttendanceTimestamp(attendanceTime);
            record.setAttendanceDate(attendanceDate);
            attendanceRepository.save(record);
            attendanceRepository.flush(); // Force immediate constraint check
        } catch (org.springframework.dao.DataIntegrityViolationException e) {
            // Database constraint caught a race condition - attendance was already marked
            log.warn("Duplicate attendance prevented by database constraint for student: {}", student.getIndexNumber());
            throw new DuplicateResourceException("Attendance already marked for this student today in " + session.getSubject().getName());
        }

        // 6. SMS notification for attendance marking is disabled
        // (only absence notifications are sent when sessions end)
    }

    @Transactional(readOnly = true)
    public SessionAttendanceStatusDto getSessionAttendanceStatus(Long sessionId) {
        // Find the session (allow both active and inactive sessions)
        AttendanceSession session = sessionRepository.findById(sessionId)
                .orElseThrow(() -> new ResourceNotFoundException("Session not found with ID: " + sessionId));

        // Get date range for the session - use system timezone for consistency
        ZoneId zoneId = ZoneId.systemDefault();
        Instant startOfDay = session.getSessionDate().atStartOfDay(zoneId).toInstant();
        Instant endOfDay = session.getSessionDate().plusDays(1).atStartOfDay(zoneId).toInstant();

        // Find all attendance records for this session
        List<AttendanceRecord> attendanceRecords = attendanceRepository.findSessionAttendanceRecords(
                session.getBatch().getId(),
                session.getSubject().getId(),
                startOfDay,
                endOfDay
        );

        // Convert to DTOs with fee payment status check
        List<SessionAttendanceStatusDto.MarkedStudentDto> markedStudents = attendanceRecords.stream()
                .map(record -> {
                    // Check if student has paid fees for this month/year by the session date
                    LocalDate sessionDate = session.getSessionDate();
                    int month = sessionDate.getMonthValue();
                    int year = sessionDate.getYear();

                    // Convert session date to end of day (23:59:59) for payment check
                    Instant endOfSessionDay = sessionDate.plusDays(1).atStartOfDay(ZoneId.systemDefault()).toInstant();

                    boolean hasPaidFees = feePaymentRepository.hasStudentPaidFeesByDate(
                            record.getStudent().getId(),
                            month,
                            year,
                            endOfSessionDay
                    );

                        List<FeeExemption> feeExemptions = feeExemptionRepository.findByStudentId(record.getStudent().getId());
                        boolean isFreeCard = feeExemptions.stream()
                            .anyMatch(exemption -> exemption.getExemptionType() == FeeExemptionType.FREE_CARD
                                && exemption.isAppliesToAllSubjects())
                            .orElse(false);

                    return new SessionAttendanceStatusDto.MarkedStudentDto(
                            record.getStudent().getStudentIdCode(),
                            record.getStudent().getIndexNumber(),
                            record.getStudent().getFullName(),
                            record.getAttendanceTimestamp(),
                            !hasPaidFees && !isFreeCard
                    );
                })
                .toList();

        // Count total enrolled students in this batch for this subject
        List<Student> enrolledStudents = studentRepository.findActiveStudentsByBatchAndSubject(
                session.getBatch().getId(),
                session.getSubject().getId()
        );

        String sessionInfo = String.format("Batch %s - %s - %s",
                session.getBatch().getBatchYear(),
                session.getSubject().getName(),
                session.getSessionDate().toString()
        );

        return new SessionAttendanceStatusDto(
                sessionId,
                sessionInfo,
                enrolledStudents.size(),
                markedStudents.size(),
                markedStudents
        );
    }

    @Transactional(readOnly = true)
    public AttendanceReportDto getAttendanceReport(LocalDate date, Integer batchId, Integer subjectId) {
        // Check if a session exists for this batch, subject, and date
        Optional<AttendanceSession> sessionOpt = sessionRepository.findByBatchAndSubjectAndDate(batchId, subjectId, date);
        if (sessionOpt.isEmpty()) {
            // No session held for this batch/subject/date: return empty report
            return new AttendanceReportDto(date, List.of(), List.of());
        }

        // 1. Get all students who should be in the class
        List<Student> enrolledStudents = studentRepository.findActiveStudentsByBatchAndSubject(batchId, subjectId);

        // 2. Get all attendance records for that batch, subject, and day
        ZoneId zoneId = ZoneId.systemDefault();
        Instant startOfDay = date.atStartOfDay(zoneId).toInstant();
        Instant endOfDay = date.plusDays(1).atStartOfDay(zoneId).toInstant();
        List<AttendanceRecord> presentRecords = attendanceRepository.findSessionAttendanceRecords(batchId, subjectId, startOfDay, endOfDay);

        Set<UUID> presentStudentIds = presentRecords.stream()
            .map(ar -> ar.getStudent().getId())
            .collect(Collectors.toSet());

        // 3. Map present students to DTO, including check-in time
        List<PresentStudentDto> presentStudentDtos = presentRecords.stream()
            .map(ar -> new PresentStudentDto(
            ar.getStudent().getId(),
            ar.getStudent().getStudentIdCode(),
            ar.getStudent().getFullName(),
            ar.getAttendanceTimestamp()
        ))
            .toList();

        // 4. Filter the enrolled list to find absent students and map to DTO
        List<StudentDto> absentStudentDtos = enrolledStudents.stream()
            .filter(student -> !presentStudentIds.contains(student.getId()))
            .map(studentService::mapToStudentDto)
            .toList();

        return new AttendanceReportDto(date, presentStudentDtos, absentStudentDtos);
    }

    /**
     * DEBUG method to get all students.
     */
    public java.util.List<Student> getAllStudents() {
        return studentRepository.findAll();
    }

    /**
     * Send SMS notification to parent when student checks in
     */
    private void sendAttendanceSms(Student student, Subject subject, Instant checkInTime) {
        try {
            // Validate parent phone number
            if (student.getParentPhone() == null || student.getParentPhone().trim().isEmpty()) {
                log.warn("Cannot send SMS - no parent phone number for student: {}", student.getFullName());
                return;
            }

            ZonedDateTime localTime = ZonedDateTime.ofInstant(checkInTime, ZoneId.systemDefault());
            String time = localTime.format(DateTimeFormatter.ofPattern("hh:mm a"));
            String date = localTime.format(DateTimeFormatter.ofPattern("EEEE, MMMM d, yyyy"));

            String message = String.format(
                    """
                    ATTENDANCE ALERT
                    
                    Dear Parent,
                    
                    Your child %s has successfully checked in to the %s class.
                    
                    Date: %s
                    Time: %s
                    
                    Thank you,
                    Universal Science Academy""",
                    student.getFullName(),
                    subject.getName(),
                    date,
                    time
            );

            log.info("=== SMS NOTIFICATION ATTEMPT ===");
            log.info("Student: {} (ID: {})", student.getFullName(), student.getStudentIdCode());
            log.info("Parent Phone: {}", student.getParentPhone());
            log.info("Subject: {}", subject.getName());
            log.info("SMS Service: {}", smsService.getClass().getSimpleName());
            log.info("Message Length: {} characters", message.length());

            smsService.sendSms(student.getParentPhone(), message);

            log.info("SMS notification sent successfully for student: {}", student.getFullName());

        } catch (Exception e) {
            log.error("=== SMS NOTIFICATION FAILED ===");
            log.error("Student: {} (ID: {})", student.getFullName(), student.getStudentIdCode());
            log.error("Parent Phone: {}", student.getParentPhone());
            log.error("Error: {}", e.getMessage());
            log.error("Full stack trace:", e);
            // Don't throw exception to avoid breaking attendance flow
        }
    }

    /**
     * Enhanced report generation method that supports filtering by student ID
     * and preserves existing single-day functionality.
     */
    @Transactional(readOnly = true)
    public EnhancedAttendanceReportDto getEnhancedAttendanceReport(AttendanceReportRequest request) {
        // Validate request
        if (!request.hasValidDateRange()) {
            throw new IllegalArgumentException("Either date or both startDate and endDate must be provided");
        }

        // Handle student-specific reports
        if (request.isStudentSpecificRequest()) {
            return generateStudentSpecificReport(request);
        }

        // Handle single-date reports (backward compatibility)
        return generateSingleDateReport(request);
    }

    private EnhancedAttendanceReportDto generateStudentSpecificReport(AttendanceReportRequest request) {
        // Find the student
        Student student = findStudentFromRequest(request);

        // Determine date range
        LocalDate startDate = request.isDateRangeRequest() ? request.getStartDate() : request.getDate();
        LocalDate endDate = request.isDateRangeRequest() ? request.getEndDate() : request.getDate();

        // Convert to Instant range
        ZoneId zoneId = ZoneId.systemDefault();
        Instant startTime = startDate.atStartOfDay(zoneId).toInstant();
        Instant endTime = endDate.plusDays(1).atStartOfDay(zoneId).toInstant();

        List<AttendanceRecord> attendanceRecords;
        List<AttendanceSession> classSessions;
        String subjectName;

        if (request.getSubjectId() != null) {
            // Student-specific report for a particular subject
            Subject subject = subjectRepository.findById(request.getSubjectId())
                    .orElseThrow(() -> new ResourceNotFoundException("Subject not found with ID: " + request.getSubjectId()));

            attendanceRecords = attendanceRepository.findByStudentAndSubjectAndDateRange(
                    student.getId(), request.getSubjectId(), startTime, endTime
            );

            classSessions = sessionRepository.findBySubjectAndDateRange(
                    request.getSubjectId(), startDate, endDate
            );

            subjectName = subject.getName();
        } else {
            // Student-specific report across all subjects
            attendanceRecords = attendanceRepository.findByStudentAndDateRange(
                    student.getId(), startTime, endTime
            );

            classSessions = List.of(); // Can't calculate total class days without a specific subject
            subjectName = "All Subjects";
        }

        // Convert to DTOs
        List<AttendanceRecordDto> recordDtos = attendanceRecords.stream()
                .map(record -> AttendanceRecordDto.createPresentRecord(
                record.getStudent().getId(),
                record.getStudent().getStudentIdCode(),
                record.getStudent().getFullName(),
                record.getSubject().getName(),
                record.getAttendanceTimestamp().atZone(zoneId).toLocalDate(),
                record.getAttendanceTimestamp()
        ))
                .toList();

        // Calculate attendance statistics
        int totalPresentDays = recordDtos.size();
        int totalClassDays = classSessions.size();

        return EnhancedAttendanceReportDto.createStudentReport(
                startDate,
                endDate,
                student.getFullName(),
                student.getStudentIdCode(),
                String.valueOf(student.getBatch().getBatchYear()),
                subjectName,
                recordDtos,
                totalPresentDays,
                totalClassDays
        );
    }

    private EnhancedAttendanceReportDto generateSingleDateReport(AttendanceReportRequest request) {
        // Use existing logic but return in new format
        AttendanceReportDto legacyReport = getAttendanceReport(
                request.getDate(),
                request.getBatchId(),
                request.getSubjectId()
        );

        // Convert legacy format to enhanced format
        List<AttendanceRecordDto> recordDtos = legacyReport.presentStudents().stream()
                .map(student -> AttendanceRecordDto.createPresentRecord(
                student.id(),
                student.studentIdCode(),
                student.fullName(),
                "", // Subject name not available in legacy format
                request.getDate(),
                student.checkInTime()
        ))
                .collect(Collectors.toList());

        // Add absent students as records
        legacyReport.absentStudents().forEach(student
                -> recordDtos.add(AttendanceRecordDto.createAbsentRecord(
                        student.id(),
                        student.studentIdCode(),
                        student.fullName(),
                        "", // Subject name not available in legacy format
                        request.getDate()
                ))
        );

        // Get subject name
        String subjectName = request.getSubjectId() != null
                ? subjectRepository.findById(request.getSubjectId())
                        .map(Subject::getName)
                        .orElse("Unknown Subject")
                : "Unknown Subject";

        return EnhancedAttendanceReportDto.createSingleDateReport(
                request.getDate(),
                "Batch " + request.getBatchId(),
                subjectName,
                recordDtos
        );
    }

    private Student findStudentFromRequest(AttendanceReportRequest request) {
        if (request.getStudentId() != null) {
            return studentRepository.findById(request.getStudentId())
                    .orElseThrow(() -> new ResourceNotFoundException("Student not found with ID: " + request.getStudentId()));
        } else if (request.getStudentIdCode() != null && !request.getStudentIdCode().trim().isEmpty()) {
            return studentRepository.findByStudentIdCode(request.getStudentIdCode())
                    .orElseThrow(() -> new ResourceNotFoundException("Student not found with ID Code: " + request.getStudentIdCode()));
        } else {
            throw new IllegalArgumentException("Either studentId or studentIdCode must be provided for student-specific reports");
        }
    }
}
