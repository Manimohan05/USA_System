package com.usa.attendancesystem.controller;

import java.time.LocalDate;
import java.util.List;

import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.usa.attendancesystem.dto.AttendanceMarkByIndexRequest;
import com.usa.attendancesystem.dto.AttendanceMarkRequest;
import com.usa.attendancesystem.dto.AttendanceReportDto;
import com.usa.attendancesystem.dto.AttendanceSessionCreateRequest;
import com.usa.attendancesystem.dto.AttendanceSessionDto;
import com.usa.attendancesystem.dto.AttendanceValidationResponseDto;
import com.usa.attendancesystem.dto.SessionAttendanceStatusDto;
import com.usa.attendancesystem.service.AttendanceService;
import com.usa.attendancesystem.service.AttendanceSessionService;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("") // No additional base path since context path already provides /api
@RequiredArgsConstructor
public class AttendanceController {

    private final AttendanceService attendanceService;
    private final AttendanceSessionService sessionService;

    // ============ SESSION MANAGEMENT ENDPOINTS (ADMIN) ============
    /**
     * ADMIN endpoint to create a new attendance session.
     */
    @PostMapping("/admin/attendance/sessions")
    public ResponseEntity<AttendanceSessionDto> createSession(
            @Valid @RequestBody AttendanceSessionCreateRequest request,
            Authentication auth) {
        try {
            System.out.println("AttendanceController - Creating session with request: " + request);
            System.out.println("AttendanceController - Authentication: " + auth.getName());
            System.out.println("AttendanceController - Authorities: " + auth.getAuthorities());

            AttendanceSessionDto session = sessionService.createSession(request, auth);
            System.out.println("AttendanceController - Session created successfully: " + session);
            return ResponseEntity.ok(session);
        } catch (Exception e) {
            System.err.println("AttendanceController - Error creating session: " + e.getClass().getSimpleName() + ": " + e.getMessage());
            e.printStackTrace();
            throw e;
        }
    }

    /**
     * ADMIN endpoint to get all active sessions.
     */
    @GetMapping("/admin/attendance/sessions")
    public ResponseEntity<List<AttendanceSessionDto>> getActiveSessions() {
        List<AttendanceSessionDto> sessions = sessionService.getActiveSessions();
        return ResponseEntity.ok(sessions);
    }

    /**
     * ADMIN endpoint to get today's active sessions.
     */
    @GetMapping("/admin/attendance/sessions/today")
    public ResponseEntity<List<AttendanceSessionDto>> getTodaysActiveSessions() {
        List<AttendanceSessionDto> sessions = sessionService.getTodaysActiveSessions();
        return ResponseEntity.ok(sessions);
    }

    /**
     * ADMIN endpoint to get a specific session.
     */
    @GetMapping("/admin/attendance/sessions/{sessionId}")
    public ResponseEntity<AttendanceSessionDto> getSession(@PathVariable Long sessionId) {
        AttendanceSessionDto session = sessionService.getSessionById(sessionId);
        return ResponseEntity.ok(session);
    }

    /**
     * ADMIN endpoint to deactivate a session.
     */
    @PutMapping("/admin/attendance/sessions/{sessionId}/deactivate")
    public ResponseEntity<Void> deactivateSession(@PathVariable Long sessionId) {
        sessionService.deactivateSession(sessionId);
        return ResponseEntity.ok().build();
    }

    /**
     * ADMIN endpoint to temporarily close a session (pause without sending SMS).
     */
    @PutMapping("/admin/attendance/sessions/{sessionId}/close")
    public ResponseEntity<Void> closeSession(@PathVariable Long sessionId) {
        sessionService.closeSessionTemporarily(sessionId);
        return ResponseEntity.ok().build();
    }

    /**
     * ADMIN endpoint to reopen a temporarily closed session.
     */
    @PutMapping("/admin/attendance/sessions/{sessionId}/reopen")
    public ResponseEntity<Void> reopenSession(@PathVariable Long sessionId) {
        sessionService.reopenSession(sessionId);
        return ResponseEntity.ok().build();
    }

    /**
     * ADMIN endpoint to reactivate an ended session within recovery window.
     */
    @PutMapping("/admin/attendance/sessions/{sessionId}/reactivate")
    public ResponseEntity<Void> reactivateSession(@PathVariable Long sessionId) {
        sessionService.reactivateSession(sessionId);
        return ResponseEntity.ok().build();
    }

    // ============ ATTENDANCE MARKING ENDPOINTS ============
    /**
     * PUBLIC endpoint for marking attendance by index number in a session with
     * enhanced validation. No authentication required - for student kiosk use.
     * Returns detailed validation results including specific error codes for
     * frontend handling.
     */
    @PostMapping("/attendance/mark-by-index")
    public ResponseEntity<AttendanceValidationResponseDto> markAttendanceByIndex(@Valid @RequestBody AttendanceMarkByIndexRequest request) {
        AttendanceValidationResponseDto response = attendanceService.markAttendanceByIndexWithValidation(request);

        // Return appropriate HTTP status based on validation result
        if (response.success()) {
            return ResponseEntity.ok(response);
        } else {
            // Return 400 Bad Request for validation errors, but include the detailed response
            return ResponseEntity.badRequest().body(response);
        }
    }

    /**
     * LEGACY endpoint - kept for backward compatibility. Use the enhanced
     * endpoint above for better error handling.
     */
    @PostMapping("/attendance/mark-by-index-simple")
    public ResponseEntity<Void> markAttendanceByIndexSimple(@Valid @RequestBody AttendanceMarkByIndexRequest request) {
        attendanceService.markAttendanceByIndex(request);
        return ResponseEntity.ok().build();
    }

    /**
     * PUBLIC endpoint for the student check-in kiosk. No authentication is
     * required. (Legacy method - kept for backward compatibility)
     */
    @PostMapping("/attendance/mark")
    public ResponseEntity<Void> markAttendance(@Valid @RequestBody AttendanceMarkRequest request) {
        attendanceService.markAttendance(request);
        return ResponseEntity.ok().build();
    }

    /**
     * PUBLIC endpoint to get current session attendance status. Shows who has
     * already marked attendance in the active session.
     */
    @GetMapping("/attendance/sessions/{sessionId}/status")
    public ResponseEntity<SessionAttendanceStatusDto> getSessionAttendanceStatus(@PathVariable Long sessionId) {
        SessionAttendanceStatusDto status = attendanceService.getSessionAttendanceStatus(sessionId);
        return ResponseEntity.ok(status);
    }

    /**
     * ADMIN endpoint to view the daily attendance report. This endpoint is
     * protected by Spring Security.
     */
    @GetMapping("/admin/attendance/report")
    public ResponseEntity<AttendanceReportDto> getAttendanceReport(
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date,
            @RequestParam Integer batchId,
            @RequestParam Integer subjectId) {
        AttendanceReportDto report = attendanceService.getAttendanceReport(date, batchId, subjectId);
        return ResponseEntity.ok(report);
    }

    /**
     * DEBUG endpoint to check current user authentication.
     */
    @GetMapping("/debug/auth")
    public ResponseEntity<String> debugAuth(Authentication auth) {
        try {
            StringBuilder sb = new StringBuilder();
            if (auth == null) {
                sb.append("No authentication found in security context\n");
            } else {
                sb.append("Authentication Details:\n");
                sb.append("Name: ").append(auth.getName()).append("\n");
                sb.append("Authenticated: ").append(auth.isAuthenticated()).append("\n");
                sb.append("Principal: ").append(auth.getPrincipal()).append("\n");
                sb.append("Authorities: ").append(auth.getAuthorities()).append("\n");
                sb.append("Details: ").append(auth.getDetails()).append("\n");
            }

            return ResponseEntity.ok(sb.toString());
        } catch (Exception e) {
            return ResponseEntity.ok("Error getting auth info: " + e.getMessage());
        }
    }

    /**
     * DEBUG endpoint to list all students.
     */
    @GetMapping("/debug/students")
    public ResponseEntity<String> debugStudents() {
        try {
            StringBuilder sb = new StringBuilder();
            sb.append("All students in database:\n");

            java.util.List<com.usa.attendancesystem.model.Student> students
                    = attendanceService.getAllStudents();

            if (students.isEmpty()) {
                sb.append("No students found in database.");
            } else {
                for (com.usa.attendancesystem.model.Student student : students) {
                    sb.append(String.format("ID: %s, Index: '%s', Name: '%s', Active: %s\n",
                            student.getId(), student.getIndexNumber(), student.getFullName(), student.isActive()));
                }
            }

            return ResponseEntity.ok(sb.toString());
        } catch (Exception e) {
            return ResponseEntity.ok("Error fetching students: " + e.getMessage());
        }
    }
}
