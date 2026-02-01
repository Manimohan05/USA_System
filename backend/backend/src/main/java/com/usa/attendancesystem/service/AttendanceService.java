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
import com.usa.attendancesystem.dto.AttendanceMarkRequest;
import com.usa.attendancesystem.dto.AttendanceReportDto;
import com.usa.attendancesystem.dto.AttendanceValidationResponseDto;
import com.usa.attendancesystem.dto.PresentStudentDto;
import com.usa.attendancesystem.dto.SessionAttendanceStatusDto;
import com.usa.attendancesystem.dto.StudentDto;
import com.usa.attendancesystem.exception.DuplicateResourceException;
import com.usa.attendancesystem.exception.ResourceNotFoundException;
import com.usa.attendancesystem.model.AttendanceRecord;
import com.usa.attendancesystem.model.AttendanceSession;
import com.usa.attendancesystem.model.Student;
import com.usa.attendancesystem.model.Subject;
import com.usa.attendancesystem.repository.AttendanceRecordRepository;
import com.usa.attendancesystem.repository.AttendanceSessionRepository;
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

        // 5. Send SMS notification
        sendAttendanceSms(student, subject, attendanceTime);
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
            return AttendanceValidationResponseDto.success(
                    "Attendance marked successfully for " + student.getFullName(),
                    studentDto,
                    Instant.now()
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

        // 6. Send enhanced SMS notification
        sendAttendanceSms(student, session.getSubject(), attendanceTime);
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

        // Convert to DTOs
        List<SessionAttendanceStatusDto.MarkedStudentDto> markedStudents = attendanceRecords.stream()
                .map(record -> new SessionAttendanceStatusDto.MarkedStudentDto(
                record.getStudent().getStudentIdCode(),
                record.getStudent().getIndexNumber(),
                record.getStudent().getFullName(),
                record.getAttendanceTimestamp()
        ))
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
        // 1. Get all students who should be in the class
        List<Student> enrolledStudents = studentRepository.findActiveStudentsByBatchAndSubject(batchId, subjectId);

        // 2. Get all attendance records for that day - use system timezone for consistency
        ZoneId zoneId = ZoneId.systemDefault();
        Instant startOfDay = date.atStartOfDay(zoneId).toInstant();
        Instant endOfDay = date.plusDays(1).atStartOfDay(zoneId).toInstant();
        List<AttendanceRecord> presentRecords = attendanceRepository.findBySubjectAndDateRange(subjectId, startOfDay, endOfDay);

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
                .map(studentService::mapToStudentDto) // This now works correctly
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
                    
                    Your child %s has successfully checked in for %s class.
                    
                    Date: %s
                    Time: %s
                    
                    Thank you,
                    USA Institute""",
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
}
