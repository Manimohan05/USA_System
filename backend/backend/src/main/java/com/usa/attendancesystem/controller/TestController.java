package com.usa.attendancesystem.controller;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.usa.attendancesystem.service.SmsService;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

@RestController
@RequestMapping("/debug")
@RequiredArgsConstructor
@Slf4j
public class TestController {

    private final SmsService smsService;

    @GetMapping("/test-sms")
    public ResponseEntity<String> testSms(@RequestParam String phoneNumber) {
        try {
            log.info("Testing SMS to phone number: {}", phoneNumber);

            String testMessage = "TEST MESSAGE\n\nThis is a test SMS from USA Institute attendance system.\n\nTime: " + java.time.LocalDateTime.now();

            smsService.sendSms(phoneNumber, testMessage);

            log.info("SMS test completed for: {}", phoneNumber);

            return ResponseEntity.ok("SMS test sent successfully to: " + phoneNumber
                    + "\n\nCheck the console logs for details."
                    + "\n\nIf using Twilio (twilio.enabled=true), check your phone."
                    + "\nIf using Mock (twilio.enabled=false), check the console logs.");
        } catch (Exception e) {
            log.error("SMS test failed for {}: {}", phoneNumber, e.getMessage(), e);
            return ResponseEntity.badRequest().body("SMS test failed: " + e.getMessage());
        }
    }

    @GetMapping("/sms-config")
    public ResponseEntity<String> getSmsConfig() {
        try {
            String smsServiceClass = smsService.getClass().getSimpleName();
            log.info("Current SMS service: {}", smsServiceClass);

            return ResponseEntity.ok("""
                    SMS Service Configuration:
                    - Service Class: %s
                    - %s
                    
                    To switch modes, set twilio.enabled=true/false in application.properties"""
                    .formatted(smsServiceClass,
                            smsServiceClass.equals("TwilioSmsService") ? "REAL SMS (Twilio)" : "MOCK SMS (Console Only)"));
        } catch (Exception e) {
            log.error("Failed to get SMS config: {}", e.getMessage(), e);
            return ResponseEntity.badRequest().body("Failed to get SMS config: " + e.getMessage());
        }
    }
}
