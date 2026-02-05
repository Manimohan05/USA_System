package com.usa.attendancesystem.service;

import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;

import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.usa.attendancesystem.dto.AttendanceSessionCreateRequest;
import com.usa.attendancesystem.dto.AttendanceSessionDto;
import com.usa.attendancesystem.exception.DuplicateResourceException;
import com.usa.attendancesystem.exception.ResourceNotFoundException;
import com.usa.attendancesystem.model.Admin;
import com.usa.attendancesystem.model.AttendanceRecord;
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
        // Return all today's sessions (active, closed, and recently ended)
        return sessionRepository.findAllSessionsByDate(LocalDate.now())
                .stream()
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
            System.out.println("AttendanceSessionService - Session is active, sending absence notifications (SMS requested)");
            sendAbsenceNotifications(session);
        } else if (!sendSms) {
            System.out.println("AttendanceSessionService - SMS not requested, skipping notifications");
        } else {
            System.out.println("AttendanceSessionService - Session is already inactive, skipping notifications");
        }

        // Deactivate the session regardless of notification success/failure
        session.setActive(false);
        session.setEndedAt(Instant.now()); // Track when session was ended
        sessionRepository.save(session);
        System.out.println("AttendanceSessionService - Session deactivated successfully");
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

        // Remove 10-minute restriction - sessions can be reactivated anytime until fully ended
        if (session.getEndedAt() == null) {
            throw new IllegalStateException("Session end time is not recorded");
        }

        // Check if session was fully ended (cannot be reactivated)
        if (session.isClosed() && session.getEndedAt() != null) {
            // If the session was temporarily closed and then ended, allow reactivation
            // Only prevent reactivation if it was explicitly fully ended
            // We can add a new field 'fullyEnded' in future if needed for now use existing logic
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

        // Send notifications regardless of current state (active, closed, or ended)
        System.out.println("AttendanceSessionService - Fully ending session, sending absence notifications");
        sendAbsenceNotifications(session);

        // Permanently end the session - make it non-reactivatable
        session.setActive(false);
        session.setClosed(true); // Mark as fully closed
        session.setEndedAt(Instant.now()); // Track when session was fully ended
        sessionRepository.save(session);
        System.out.println("AttendanceSessionService - Session fully ended successfully");
    }

    /**
     * Send SMS notifications to parents of students who were absent from the
     * session
     */
    private void sendAbsenceNotifications(AttendanceSession session) {
        try {
            System.out.println("=================================================");
            System.out.println("📱 SMS NOTIFICATION DEBUG - Session: " + session.getId());
            System.out.println("=================================================");
            System.out.println("📊 Session Details:");
            System.out.println("   • Batch ID: " + session.getBatch().getId() + " (Batch " + session.getBatch().getBatchYear() + ")");
            System.out.println("   • Subject ID: " + session.getSubject().getId() + " (" + session.getSubject().getName() + ")");
            System.out.println("   • Session Date: " + session.getSessionDate());

            // Get all enrolled students for this batch and subject
            List<Student> enrolledStudents = studentRepository.findActiveStudentsByBatchAndSubject(
                    session.getBatch().getId(),
                    session.getSubject().getId()
            );

            System.out.println("👥 Found " + enrolledStudents.size() + " enrolled students in this batch-subject combination:");
            for (Student student : enrolledStudents) {
                System.out.println("   • " + student.getFullName() + " (ID: " + student.getStudentIdCode()
                        + ", Parent Phone: " + (student.getParentPhone() != null ? student.getParentPhone() : "NONE") + ")");
            }

            if (enrolledStudents.isEmpty()) {
                System.out.println("❌ ISSUE FOUND: No students are enrolled in Batch " + session.getBatch().getBatchYear()
                        + " for subject '" + session.getSubject().getName() + "'");
                System.out.println("💡 SOLUTION: Make sure students are enrolled in this subject through the student management system");
                return;
            }

            // Get attendance records for this session (same day, batch, subject)
            ZoneId zoneId = ZoneId.systemDefault();
            Instant startOfDay = session.getSessionDate().atStartOfDay(zoneId).toInstant();
            Instant endOfDay = session.getSessionDate().plusDays(1).atStartOfDay(zoneId).toInstant();

            List<AttendanceRecord> attendanceRecords = attendanceRecordRepository.findSessionAttendanceRecords(
                    session.getBatch().getId(),
                    session.getSubject().getId(),
                    startOfDay,
                    endOfDay
            );

            System.out.println("📋 Found " + attendanceRecords.size() + " attendance records for " + session.getSessionDate() + ":");
            for (AttendanceRecord record : attendanceRecords) {
                System.out.println("   • " + record.getStudent().getFullName()
                        + " marked present at " + record.getAttendanceTimestamp());
            }

            // Get set of students who attended
            Set<String> attendedStudentIds = attendanceRecords.stream()
                    .map(record -> record.getStudent().getStudentIdCode())
                    .collect(Collectors.toSet());

            // Find absent students (enrolled but didn't attend)
            List<Student> absentStudents = enrolledStudents.stream()
                    .filter(student -> !attendedStudentIds.contains(student.getStudentIdCode()))
                    .toList();

            System.out.println("❌ Found " + absentStudents.size() + " absent students:");
            for (Student student : absentStudents) {
                System.out.println("   • " + student.getFullName() + " (ID: " + student.getStudentIdCode()
                        + ", Parent Phone: " + (student.getParentPhone() != null ? student.getParentPhone() : "NONE") + ")");
            }

            // Filter absent students who have parent phone numbers
            List<Student> absentStudentsWithPhones = absentStudents.stream()
                    .filter(student -> student.getParentPhone() != null && !student.getParentPhone().trim().isEmpty())
                    .toList();

            System.out.println("📱 Absent students with parent phone numbers: " + absentStudentsWithPhones.size());

            if (absentStudents.isEmpty()) {
                System.out.println("✅ GREAT NEWS: All enrolled students attended the class! No absence notifications needed.");
                return;
            }

            if (absentStudentsWithPhones.isEmpty()) {
                System.out.println("❌ ISSUE FOUND: " + absentStudents.size() + " students were absent, but none have parent phone numbers stored");
                System.out.println("💡 SOLUTION: Add parent phone numbers to student records in the student management system");
                return;
            }

            System.out.println("📤 Sending SMS notifications to " + absentStudentsWithPhones.size() + " parents...");

            // Send notifications to parents of absent students
            for (Student absentStudent : absentStudentsWithPhones) {
                String message = createAbsenceMessage(absentStudent, session);
                try {
                    System.out.println("   📤 Sending SMS to " + absentStudent.getParentPhone()
                            + " for " + absentStudent.getFullName() + "...");
                    smsService.sendSms(absentStudent.getParentPhone(), message);
                    System.out.println("   ✅ SMS sent successfully to " + absentStudent.getFullName() + "'s parent");
                } catch (Exception e) {
                    System.err.println("   ❌ Failed to send SMS for student " + absentStudent.getFullName() + ": " + e.getMessage());
                    e.printStackTrace();
                    // Continue with other students even if one fails
                }
            }

            System.out.println("📱 SMS notification process completed!");
            System.out.println("=================================================");

        } catch (Exception e) {
            System.err.println("❌ ERROR in sendAbsenceNotifications: " + e.getMessage());
            e.printStackTrace();
            // Don't throw exception to avoid disrupting session deactivation
        }
    }

    /**
     * Create a personalized absence notification message for parents
     */
    private String createAbsenceMessage(Student student, AttendanceSession session) {
        String studentName = student.getFullName();
        String subjectName = session.getSubject().getName();
        String batchYear = String.valueOf(session.getBatch().getBatchYear());
        String sessionDate = session.getSessionDate().format(DateTimeFormatter.ofPattern("MMMM dd, yyyy"));

        return String.format(
                "Dear Parent, we would like to inform you that %s was absent from the %s class (Batch %s) held on %s. "
                + "If this was due to illness or other circumstances, please contact the institute. "
                + "Regular attendance is important for your child's academic progress. Thank you.",
                studentName, subjectName, batchYear, sessionDate
        );
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
}
