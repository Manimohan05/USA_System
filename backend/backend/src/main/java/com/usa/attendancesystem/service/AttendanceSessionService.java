package com.usa.attendancesystem.service;

import java.time.Instant;
import java.time.LocalDate;
import java.util.List;

import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.usa.attendancesystem.dto.AttendanceSessionCreateRequest;
import com.usa.attendancesystem.dto.AttendanceSessionDto;
import com.usa.attendancesystem.exception.DuplicateResourceException;
import com.usa.attendancesystem.exception.ResourceNotFoundException;
import com.usa.attendancesystem.model.Admin;
import com.usa.attendancesystem.model.AttendanceSession;
import com.usa.attendancesystem.model.Batch;
import com.usa.attendancesystem.model.Student;
import com.usa.attendancesystem.model.Subject;
import com.usa.attendancesystem.repository.AdminRepository;
import com.usa.attendancesystem.repository.AttendanceRecordRepository;
import com.usa.attendancesystem.repository.AttendanceSessionRepository;
import com.usa.attendancesystem.repository.BatchRepository;
import com.usa.attendancesystem.repository.StudentRepository;
import com.usa.attendancesystem.repository.SubjectRepository;

import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class AttendanceSessionService {

    private final AttendanceSessionRepository sessionRepository;
    private final BatchRepository batchRepository;
    private final SubjectRepository subjectRepository;
    private final AdminRepository adminRepository;
    private final StudentRepository studentRepository;
    private final AttendanceRecordRepository attendanceRecordRepository;
    private final SmsService smsService;

    @Transactional
    public AttendanceSessionDto createSession(AttendanceSessionCreateRequest request, Authentication auth) {
        try {
            System.out.println("AttendanceSessionService - Creating session with request: " + request);

            // Find batch and subject
            System.out.println("AttendanceSessionService - Looking for batch ID: " + request.batchId());
            Batch batch = batchRepository.findById(request.batchId())
                    .orElseThrow(() -> new ResourceNotFoundException("Batch not found with ID: " + request.batchId()));
            System.out.println("AttendanceSessionService - Found batch: " + batch.getId());

            System.out.println("AttendanceSessionService - Looking for subject ID: " + request.subjectId());
            Subject subject = subjectRepository.findById(request.subjectId())
                    .orElseThrow(() -> new ResourceNotFoundException("Subject not found with ID: " + request.subjectId()));
            System.out.println("AttendanceSessionService - Found subject: " + subject.getName());

            // Find admin creating the session
            String username = auth.getName();
            System.out.println("AttendanceSessionService - Looking for admin: " + username);
            Admin admin = adminRepository.findByUsername(username)
                    .orElseThrow(() -> new ResourceNotFoundException("Admin not found: " + username));
            System.out.println("AttendanceSessionService - Found admin: " + admin.getUsername());

            // Check if there's an ACTIVE session for this date/batch/subject
            // Allow recreating sessions if the previous one was ended (accidentally)
            System.out.println("AttendanceSessionService - Checking for ACTIVE session for date: " + request.sessionDate());
            sessionRepository.findActiveSessionByBatchAndSubjectAndDate(request.batchId(), request.subjectId(), request.sessionDate())
                    .ifPresent(existing -> {
                        String message = String.format(
                                "An ACTIVE attendance session already exists for Batch %d - %s on %s. Session ID: %d. Please end the current session first.",
                                batch.getBatchYear(),
                                subject.getName(),
                                request.sessionDate(),
                                existing.getId()
                        );
                        throw new DuplicateResourceException(message);
                    });

            // Create new session
            System.out.println("AttendanceSessionService - Creating new session");
            AttendanceSession session = new AttendanceSession(batch, subject, request.sessionDate(), admin);
            session = sessionRepository.save(session);
            System.out.println("AttendanceSessionService - Session saved with ID: " + session.getId());

            // Convert to DTO
            AttendanceSessionDto dto = new AttendanceSessionDto(
                    session.getId(),
                    batch.getId(),
                    String.valueOf(batch.getBatchYear()),
                    batch.getDisplayName(),
                    subject.getId(),
                    subject.getName(),
                    session.getSessionDate(),
                    session.isActive(),
                    session.isClosed(),
                    false, // canReactivate is false for new sessions
                    session.getCreatedAt(),
                    session.getEndedAt()
            );
            System.out.println("AttendanceSessionService - Returning DTO: " + dto);
            return dto;
        } catch (Exception e) {
            System.err.println("AttendanceSessionService - Error creating session: " + e.getClass().getSimpleName() + ": " + e.getMessage());
            e.printStackTrace();
            throw e;
        }
    }

    @Transactional(readOnly = true)
    public List<AttendanceSessionDto> getActiveSessions() {
        return sessionRepository.findAllActiveSessions()
                .stream()
                .map(this::mapToDto)
                .toList();
    }

    @Transactional(readOnly = true)
    public List<AttendanceSessionDto> getTodaysActiveSessions() {
        List<AttendanceSession> todaysSessions = sessionRepository.findAllSessionsByDate(LocalDate.now());
        
        // Filter out auto-expired sessions (inactive AND closed)
        return todaysSessions
                .stream()
                .filter(session -> session.isActive() || !session.isClosed())
                .map(this::mapToDto)
                .toList();
    }

    @Transactional(readOnly = true)
    public List<AttendanceSessionDto> getAllSessions() {
        List<AttendanceSession> allSessions = sessionRepository.findAll();
        
        // Return all sessions ordered by most recent first
        return allSessions
                .stream()
                .sorted((s1, s2) -> s2.getCreatedAt().compareTo(s1.getCreatedAt()))
                .map(this::mapToDto)
                .toList();
    }

    @Transactional(readOnly = true)
    public AttendanceSessionDto getSessionById(Long sessionId) {
        // Use findById instead of findActiveSessionById to allow viewing ended sessions
        AttendanceSession session = sessionRepository.findById(sessionId)
                .orElseThrow(() -> new ResourceNotFoundException("Session not found with ID: " + sessionId));
        return mapToDto(session);
    }

    @Transactional
    public void deactivateSession(Long sessionId) {
        deactivateSession(sessionId, false); // Default: no SMS for manual end
    }

    @Transactional
    public void deactivateSession(Long sessionId, boolean sendSms) {
        System.out.println("AttendanceSessionService - Starting deactivation for session: " + sessionId + ", sendSms: " + sendSms);

        AttendanceSession session = sessionRepository.findById(sessionId)
                .orElseThrow(() -> new ResourceNotFoundException("Session not found with ID: " + sessionId));

        System.out.println("AttendanceSessionService - Found session: " + session.getId() + ", isActive: " + session.isActive());

        // Send notifications only if requested and session is currently active
        if (sendSms && session.isActive()) {
            System.out.println("AttendanceSessionService - Sending absence notifications");
            sendAbsenceNotifications(session);
        } else if (!sendSms) {
            System.out.println("AttendanceSessionService - SMS not requested, skipping notifications");
        } else {
            System.out.println("AttendanceSessionService - Session is already inactive, skipping notifications");
        }

        // Deactivate the session
        session.setActive(false);
        session.setEndedAt(Instant.now());

        // If SMS was requested (auto-expire), make session non-reactivatable
        if (sendSms) {
            session.setClosed(true); // Auto-expired sessions cannot be reactivated
            System.out.println("AttendanceSessionService - Auto-expired session marked as closed (non-reactivatable)");
        } else {
            System.out.println("AttendanceSessionService - Manual end - session can be reactivated");
        }

        sessionRepository.save(session);
        System.out.println("AttendanceSessionService - Session deactivated successfully. Final state: active="
                + session.isActive() + ", closed=" + session.isClosed() + ", endedAt=" + session.getEndedAt());
    }

    @Transactional
    public void closeSessionTemporarily(Long sessionId) {
        System.out.println("AttendanceSessionService - Starting temporary close for session: " + sessionId);

        AttendanceSession session = sessionRepository.findById(sessionId)
                .orElseThrow(() -> new ResourceNotFoundException("Session not found with ID: " + sessionId));

        if (!session.isActive()) {
            throw new IllegalStateException("Cannot close an inactive session");
        }

        // Close the session temporarily (no SMS notifications sent)
        session.setClosed(true);
        sessionRepository.save(session);
        System.out.println("AttendanceSessionService - Session closed temporarily (no SMS sent)");
    }

    @Transactional
    public void reopenSession(Long sessionId) {
        System.out.println("AttendanceSessionService - Starting reopen for session: " + sessionId);

        AttendanceSession session = sessionRepository.findById(sessionId)
                .orElseThrow(() -> new ResourceNotFoundException("Session not found with ID: " + sessionId));

        System.out.println("AttendanceSessionService - Found session: " + session.getId() + ", isActive: " + session.isActive() + ", isClosed: " + session.isClosed());

        // Check if session is already active
        if (session.isActive()) {
            throw new IllegalStateException("Session is already active");
        }

        // Reactivate the session - this allows attendance marking to continue with same ID
        session.setActive(true);
        session.setClosed(false); // Also clear any temporary close flag
        sessionRepository.save(session);

        System.out.println("AttendanceSessionService - Session reopened successfully - isActive: " + session.isActive());
    }

    @Transactional
    public void reactivateSession(Long sessionId) {
        System.out.println("AttendanceSessionService - Starting reactivation for session: " + sessionId);

        AttendanceSession session = sessionRepository.findById(sessionId)
                .orElseThrow(() -> new ResourceNotFoundException("Session not found with ID: " + sessionId));

        if (session.isActive()) {
            throw new IllegalStateException("Session is already active");
        }

        // Sessions can be reactivated anytime until fully ended
        if (session.getEndedAt() == null) {
            throw new IllegalStateException("Session end time is not recorded");
        }

        // Fully ended sessions cannot be reactivated
        if (session.isClosed()) {
            throw new IllegalStateException("Cannot reactivate a fully ended session");
        }

        // Reactivate the session
        session.setActive(true);
        session.setClosed(false); // Ensure it's not closed when reactivated
        session.setEndedAt(null); // Clear the ended timestamp
        sessionRepository.save(session);
        System.out.println("AttendanceSessionService - Session reactivated successfully");
    }

    @Transactional
    public void fullyEndSession(Long sessionId) {
        System.out.println("AttendanceSessionService - Starting full end for session: " + sessionId);

        AttendanceSession session = sessionRepository.findById(sessionId)
                .orElseThrow(() -> new ResourceNotFoundException("Session not found with ID: " + sessionId));

        // Check if session was created within the last 5 minutes
        Instant now = Instant.now();
        Instant sessionCreated = session.getCreatedAt();
        long minutesSinceCreation = java.time.Duration.between(sessionCreated, now).toMinutes();

        if (minutesSinceCreation < 5) {
            // Session created within 5 minutes - delete completely without SMS
            System.out.println("AttendanceSessionService - Session created " + minutesSinceCreation + " minutes ago, deleting without SMS");

            // First delete any attendance records for this session (by batch, subject, date)
            attendanceRecordRepository.deleteByBatchSubjectAndDate(
                    session.getBatch().getId(),
                    session.getSubject().getId(),
                    session.getSessionDate()
            );
            System.out.println("AttendanceSessionService - Deleted attendance records for session: " + sessionId);

            // Then delete the session itself
            sessionRepository.delete(session);
            System.out.println("AttendanceSessionService - Session deleted successfully (no SMS sent)");
        } else {
            // Session older than 5 minutes - perform normal fully-end with SMS
            System.out.println("AttendanceSessionService - Session created " + minutesSinceCreation + " minutes ago, fully ending with SMS");

            // Send notifications for absent students
            System.out.println("AttendanceSessionService - Sending absence notifications for fully ended session");
            sendAbsenceNotifications(session);

            // Permanently end the session - make it non-reactivatable
            session.setActive(false);
            session.setClosed(true); // Mark as fully closed
            session.setEndedAt(now); // Track when session was fully ended
            sessionRepository.save(session);
            System.out.println("AttendanceSessionService - Session fully ended successfully with SMS sent");
        }
    }

    private AttendanceSessionDto mapToDto(AttendanceSession session) {
        // Calculate canReactivate - session can be reactivated if it's inactive and not fully ended
        boolean canReactivate = false;
        if (!session.isActive() && session.getEndedAt() != null) {
            // Sessions can be reactivated anytime until fully ended (closed = true)
            // If session is closed=true and ended, it was fully ended and cannot be reactivated
            canReactivate = !session.isClosed();
        }

        return new AttendanceSessionDto(
                session.getId(),
                session.getBatch().getId(),
                String.valueOf(session.getBatch().getBatchYear()),
                session.getBatch().getDisplayName(),
                session.getSubject().getId(),
                session.getSubject().getName(),
                session.getSessionDate(),
                session.isActive(),
                session.isClosed(),
                canReactivate,
                session.getCreatedAt(),
                session.getEndedAt()
        );
    }

    /**
     * Send SMS notifications to parents of absent students
     */
    private void sendAbsenceNotifications(AttendanceSession session) {
        try {
            System.out.println("AttendanceSessionService - Starting absence notification process");

            // 1. Find all students enrolled in this batch and subject
            java.util.List<Student> enrolledStudents = studentRepository.findActiveStudentsByBatchAndSubject(
                    session.getBatch().getId(), session.getSubject().getId());
            System.out.printf("AttendanceSessionService - Found %d enrolled students%n", enrolledStudents.size());

            if (enrolledStudents.isEmpty()) {
                System.out.println("AttendanceSessionService - No enrolled students found, skipping notifications");
                return;
            }

            // 2. Find students who marked attendance on this session date
            java.time.ZoneId zoneId = java.time.ZoneId.systemDefault();
            java.time.Instant startOfDay = session.getSessionDate().atStartOfDay(zoneId).toInstant();
            java.time.Instant endOfDay = session.getSessionDate().plusDays(1).atStartOfDay(zoneId).toInstant();

            java.util.List<java.util.UUID> presentStudentIds = attendanceRecordRepository
                    .findPresentStudentIdsBySubjectAndDateRange(session.getSubject().getId(), startOfDay, endOfDay);
            System.out.printf("AttendanceSessionService - Found %d present students%n", presentStudentIds.size());

            // 3. Find absent students (enrolled but not present) with parent phone numbers
            java.util.List<Student> absentStudentsWithContacts = enrolledStudents.stream()
                    .filter(student -> !presentStudentIds.contains(student.getId()))
                    .filter(student -> student.getParentPhone() != null && !student.getParentPhone().trim().isEmpty())
                    .collect(java.util.stream.Collectors.toList());

            System.out.printf("AttendanceSessionService - Found %d absent students with parent contacts%n",
                    absentStudentsWithContacts.size());

            if (absentStudentsWithContacts.isEmpty()) {
                System.out.println("AttendanceSessionService - No absent students with parent contacts found");
                return;
            }

            // 4. Send SMS to each absent student's parent
            int successCount = 0;
            int failureCount = 0;

            for (Student student : absentStudentsWithContacts) {
                try {
                    String message = createAbsenceMessage(student, session);
                    smsService.sendSms(student.getParentPhone(), message);
                    System.out.printf("AttendanceSessionService - Sent absence notification for student: %s%n",
                            student.getFullName());
                    successCount++;
                } catch (Exception e) {
                    System.err.printf("AttendanceSessionService - Failed to send SMS for student %s: %s%n",
                            student.getFullName(), e.getMessage());
                    failureCount++;
                }
            }

            System.out.printf("AttendanceSessionService - Absence notifications completed. Success: %d, Failed: %d%n",
                    successCount, failureCount);

        } catch (Exception e) {
            System.err.println("AttendanceSessionService - Error during absence notification process: " + e.getMessage());
            e.printStackTrace();
            // Don't throw exception to avoid breaking session ending process
        }
    }

    /**
     * Create absence notification message
     */
    private String createAbsenceMessage(Student student, AttendanceSession session) {
        java.time.format.DateTimeFormatter dateFormatter = java.time.format.DateTimeFormatter.ofPattern("MMMM d, yyyy");
        String formattedDate = session.getSessionDate().format(dateFormatter);

        return String.format(
                "Dear Parent, we would like to inform you that %s was absent from the %s class (Batch %s) held on %s. "
                + "If this was due to illness or other circumstances, please contact the institute. "
                + "Regular attendance is important for your child's academic progress. Thank you.",
                student.getFullName(),
                session.getSubject().getName(),
                session.getBatch().getBatchYear(),
                formattedDate
        );
    }
}
