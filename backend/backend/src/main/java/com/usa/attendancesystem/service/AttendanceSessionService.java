package com.usa.attendancesystem.service;

import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneOffset;
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

            // Check if session already exists for this date/batch/subject
            System.out.println("AttendanceSessionService - Checking for existing session for date: " + request.sessionDate());
            sessionRepository.findByBatchAndSubjectAndDate(request.batchId(), request.subjectId(), request.sessionDate())
                    .ifPresent(existing -> {
                        String status = existing.isActive() ? "ACTIVE" : "ENDED";
                        String message = String.format(
                                "Attendance session already exists for Batch %d - %s on %s. Status: %s. Session ID: %d",
                                batch.getBatchYear(),
                                subject.getName(),
                                request.sessionDate(),
                                status,
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
                    session.getCreatedAt()
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
        return sessionRepository.findActiveSessionsByDate(LocalDate.now())
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
        System.out.println("AttendanceSessionService - Starting deactivation for session: " + sessionId);

        AttendanceSession session = sessionRepository.findById(sessionId)
                .orElseThrow(() -> new ResourceNotFoundException("Session not found with ID: " + sessionId));

        System.out.println("AttendanceSessionService - Found session: " + session.getId() + ", isActive: " + session.isActive());

        // Only send notifications if the session is currently active (to avoid duplicate notifications)
        if (session.isActive()) {
            System.out.println("AttendanceSessionService - Session is active, sending absence notifications");
            sendAbsenceNotifications(session);
        } else {
            System.out.println("AttendanceSessionService - Session is already inactive, skipping notifications");
        }

        // Deactivate the session regardless of notification success/failure
        session.setActive(false);
        sessionRepository.save(session);
        System.out.println("AttendanceSessionService - Session deactivated successfully");
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
            Instant startOfDay = session.getSessionDate().atStartOfDay(ZoneOffset.UTC).toInstant();
            Instant endOfDay = session.getSessionDate().plusDays(1).atStartOfDay(ZoneOffset.UTC).toInstant();

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
        return new AttendanceSessionDto(
                session.getId(),
                session.getBatch().getId(),
                String.valueOf(session.getBatch().getBatchYear()),
                session.getSubject().getId(),
                session.getSubject().getName(),
                session.getSessionDate(),
                session.isActive(),
                session.getCreatedAt()
        );
    }
}
