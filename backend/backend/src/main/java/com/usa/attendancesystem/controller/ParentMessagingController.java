package com.usa.attendancesystem.controller;

import java.util.Map;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.usa.attendancesystem.dto.BroadcastMessageRequest;
import com.usa.attendancesystem.dto.MessagingStatsDto;
import com.usa.attendancesystem.dto.TargetedStudentCountDto;
import com.usa.attendancesystem.service.ParentMessagingService;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/admin/messaging")
@RequiredArgsConstructor
public class ParentMessagingController {

    private final ParentMessagingService parentMessagingService;

    @PostMapping("/broadcast")
    public ResponseEntity<Void> sendBroadcast(@Valid @RequestBody BroadcastMessageRequest request) {
        parentMessagingService.sendBroadcastMessage(request);
        return ResponseEntity.ok().build();
    }

    @PostMapping("/fee-reminders")
    public ResponseEntity<Map<String, String>> sendFeeReminders() {
        int remindersSent = parentMessagingService.sendFeeReminders();
        String message = String.format("Successfully sent %d fee reminders.", remindersSent);
        return ResponseEntity.ok(Map.of("message", message));
    }

    @GetMapping("/stats")
    public ResponseEntity<MessagingStatsDto> getMessagingStats() {
        MessagingStatsDto stats = parentMessagingService.getMessagingStats();
        return ResponseEntity.ok(stats);
    }

    @GetMapping("/targeted-count")
    public ResponseEntity<TargetedStudentCountDto> getTargetedStudentCount(
            @RequestParam(required = false) Integer batchId,
            @RequestParam(required = false) Integer subjectId) {
        TargetedStudentCountDto counts = parentMessagingService.getTargetedStudentCount(batchId, subjectId);
        return ResponseEntity.ok(counts);
    }
}
