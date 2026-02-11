package com.usa.attendancesystem.service;

import java.time.LocalDateTime;
import java.time.ZoneId;
import java.util.List;

import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.usa.attendancesystem.model.AttendanceSession;
import com.usa.attendancesystem.repository.AttendanceSessionRepository;

import lombok.RequiredArgsConstructor;

/**
 * Service to automatically expire attendance sessions after 1 hour. This
 * ensures that sessions don't stay active indefinitely.
 */
@Service
@RequiredArgsConstructor
public class SessionExpirationService {

    private final AttendanceSessionRepository sessionRepository;
    private final AttendanceSessionService sessionService;

    /**
     * Runs every 10 minutes to check for expired sessions. Sessions are
     * considered expired if they have been active for more than 60 minutes.
     */
    @Scheduled(fixedRate = 600000) // 10 minutes = 600,000 milliseconds
    @Transactional
    public void checkAndExpireActiveSessions() {
        System.out.println("SessionExpirationService - Checking for expired sessions...");

        try {
            // Find all currently active sessions
            List<AttendanceSession> activeSessions = sessionRepository.findAllActiveSessions();

            if (activeSessions.isEmpty()) {
                System.out.println("SessionExpirationService - No active sessions found");
                return;
            }

            System.out.println("SessionExpirationService - Found " + activeSessions.size() + " active sessions");

            LocalDateTime now = LocalDateTime.now();
            int expiredCount = 0;

            for (AttendanceSession session : activeSessions) {
                // Calculate session age in minutes
                LocalDateTime sessionCreated = session.getCreatedAt()
                        .atZone(ZoneId.systemDefault()).toLocalDateTime();

                long minutesElapsed = java.time.Duration.between(sessionCreated, now).toMinutes();

                System.out.println("SessionExpirationService - Session " + session.getId()
                        + " (Batch " + session.getBatch().getBatchYear() + " " + session.getSubject().getName()
                        + ") - Age: " + minutesElapsed + " minutes");

                // Expire sessions that are older than 60 minutes
                if (minutesElapsed >= 60) {
                    System.out.println("SessionExpirationService - Auto-expiring session " + session.getId()
                            + " (age: " + minutesElapsed + " minutes)");

                    try {
                        // Use the existing deactivateSession method with SMS notifications
                        sessionService.deactivateSession(session.getId(), true);
                        expiredCount++;

                        System.out.println("SessionExpirationService - Successfully expired session " + session.getId()
                                + " - Session is now HIDDEN from UI (auto-expired sessions disappear)");
                    } catch (Exception e) {
                        System.err.println("SessionExpirationService - Error expiring session " + session.getId() + ": " + e.getMessage());
                        e.printStackTrace();
                    }
                }
            }

            if (expiredCount > 0) {
                System.out.println("SessionExpirationService - Auto-expired " + expiredCount + " sessions");
            } else {
                System.out.println("SessionExpirationService - No sessions needed expiration");
            }

        } catch (Exception e) {
            System.err.println("SessionExpirationService - Error during expiration check: " + e.getMessage());
            e.printStackTrace();
        }
    }
}
