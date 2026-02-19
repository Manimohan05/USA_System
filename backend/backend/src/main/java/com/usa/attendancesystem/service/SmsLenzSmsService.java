package com.usa.attendancesystem.service;

import java.util.LinkedHashMap;
import java.util.Map;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.util.MultiValueMap;
import org.springframework.web.client.RestTemplate;

@Service
@ConditionalOnProperty(name = "sms.provider", havingValue = "smslenz", matchIfMissing = true)
public class SmsLenzSmsService implements SmsService {

    private static final Logger log = LoggerFactory.getLogger(SmsLenzSmsService.class);

    private final RestTemplate restTemplate = new RestTemplate();
    private final String baseUrl;
    private final String sendEndpoint;
    private final String userId;
    private final String apiKey;
    private final String senderId;

    public SmsLenzSmsService(
            @Value("${smslenz.base-url}") String baseUrl,
            @Value("${smslenz.send-endpoint}") String sendEndpoint,
            @Value("${smslenz.user-id}") String userId,
            @Value("${smslenz.api-key}") String apiKey,
            @Value("${smslenz.sender-id:}") String senderId) {
        this.baseUrl = baseUrl;
        this.sendEndpoint = sendEndpoint;
        this.userId = userId;
        this.apiKey = apiKey;
        this.senderId = senderId;
    }

    @Override
    public void sendSms(String toPhoneNumber, String message) {
        try {
            if (apiKey == null || apiKey.trim().isEmpty()) {
                log.warn("SMSLenz API key is empty. Skipping SMS send.");
                return;
            }

            String normalizedPhone = normalizePhoneNumber(toPhoneNumber);
            String url = buildUrl();

            Map<String, String> payload = new LinkedHashMap<>();
            payload.put("user_id", userId);
            payload.put("api_key", apiKey);
            payload.put("sender_id", senderId);
            payload.put("contact", normalizedPhone);
            payload.put("message", message);

            MultiValueMap<String, String> formData = new LinkedMultiValueMap<>();
            payload.forEach(formData::add);

            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_FORM_URLENCODED);

            HttpEntity<MultiValueMap<String, String>> request = new HttpEntity<>(formData, headers);
            ResponseEntity<String> response = restTemplate.postForEntity(url, request, String.class);

            log.info("SMSLenz response status: {}", response.getStatusCode());
            log.info("SMSLenz response body: {}", response.getBody());
        } catch (Exception e) {
            log.error("SMSLenz send failed for {}: {}", toPhoneNumber, e.getMessage(), e);
        }
    }

    private String buildUrl() {
        String cleanBase = baseUrl.endsWith("/") ? baseUrl.substring(0, baseUrl.length() - 1) : baseUrl;
        String cleanPath = sendEndpoint.startsWith("/") ? sendEndpoint : "/" + sendEndpoint;
        return cleanBase + cleanPath;
    }

    private String normalizePhoneNumber(String phoneNumber) {
        if (phoneNumber == null) {
            return "";
        }

        String cleaned = phoneNumber.replaceAll("\\D", "");

        if (cleaned.startsWith("94") && cleaned.length() == 11) {
            return "+" + cleaned;
        }

        if (cleaned.startsWith("0") && cleaned.length() == 10) {
            return "+94" + cleaned.substring(1);
        }

        if (cleaned.length() == 9) {
            return "+94" + cleaned;
        }

        return cleaned.startsWith("+") ? cleaned : "+" + cleaned;
    }
}
