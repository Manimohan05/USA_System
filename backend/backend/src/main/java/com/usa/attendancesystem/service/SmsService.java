package com.usa.attendancesystem.service;

public interface SmsService {
    void sendSms(String toPhoneNumber, String message);
}