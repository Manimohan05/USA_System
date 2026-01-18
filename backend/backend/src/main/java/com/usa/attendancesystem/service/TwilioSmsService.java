package com.usa.attendancesystem.service;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.context.annotation.Primary;
import org.springframework.stereotype.Service;

import com.twilio.Twilio;
import com.twilio.rest.api.v2010.account.Message;
import com.twilio.type.PhoneNumber;

@Service
@Primary
@ConditionalOnProperty(name = "twilio.enabled", havingValue = "true", matchIfMissing = false)
public class TwilioSmsService implements SmsService {

    private static final Logger log = LoggerFactory.getLogger(TwilioSmsService.class);

    private final String fromNumber;

    // Spring injects the properties from your application.properties file
    public TwilioSmsService(
            @Value("${twilio.account.sid}") String accountSid,
            @Value("${twilio.auth.token}") String authToken,
            @Value("${twilio.phone.number}") String fromNumber) {
        this.fromNumber = fromNumber;
        Twilio.init(accountSid, authToken);
        log.info("Twilio initialized with account SID: {}", accountSid);
    }

    @Override
    public void sendSms(String toPhoneNumber, String messageBody) {
        try {
            log.info("=== TWILIO SMS SERVICE ===");
            log.info("From Number: {}", fromNumber);
            log.info("Original Number: {}", toPhoneNumber);

            // Simple Sri Lankan number formatting for Twilio
            String formattedNumber = formatSriLankanNumber(toPhoneNumber);
            log.info("Formatted Number: {}", formattedNumber);

            // Validate phone number format
            if (formattedNumber == null || !formattedNumber.startsWith("+")) {
                throw new IllegalArgumentException("Invalid phone number format: " + toPhoneNumber);
            }

            log.info("Message content (length: {}): {}", messageBody.length(), messageBody);

            Message message = Message.creator(
                    new PhoneNumber(formattedNumber),
                    new PhoneNumber(fromNumber),
                    messageBody
            ).create();

            log.info("✅ SMS SENT SUCCESSFULLY!");
            log.info("Message SID: {}", message.getSid());
            log.info("Status: {}", message.getStatus());
            log.info("To: {}", message.getTo());
        } catch (RuntimeException e) {
            log.error("❌ TWILIO SMS FAILED");
            log.error("Original Number: {}", toPhoneNumber);
            log.error("Error Type: {}", e.getClass().getSimpleName());
            log.error("Error Message: {}", e.getMessage());
            log.error("Full stack trace:", e);
            // Don't throw exception to avoid breaking attendance flow
        }
    }

    private String formatSriLankanNumber(String phoneNumber) {
        if (phoneNumber == null || phoneNumber.trim().isEmpty()) {
            return phoneNumber;
        }

        String cleaned = phoneNumber.trim();

        // If already has +94, return as is
        if (cleaned.startsWith("+94")) {
            return cleaned;
        }

        // If starts with 0 (Sri Lankan format), remove 0 and add +94
        if (cleaned.startsWith("0") && cleaned.length() == 10) {
            return "+94" + cleaned.substring(1);
        }

        // If 9 digits (no leading 0), add +94
        if (cleaned.length() == 9) {
            return "+94" + cleaned;
        }

        // Return original if no pattern matches
        return phoneNumber;
    }
}
