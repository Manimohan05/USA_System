# SMS Notification Debug Guide

## Issue: Parents of absent students are not receiving SMS notifications when sessions end

### Root Causes and Solutions

#### 1. **Check Student Data**

The most common issue is that students in your database don't have parent phone numbers stored. The system filters out students without parent contact information.

**To Check:** Go to your student management section and verify that students have parent phone numbers filled in.

**Required:** Students must have a `parent_phone` field with a valid phone number like `0771234567` or `+94771234567`.

#### 2. **Verify Student-Subject Enrollment**

Students must be properly enrolled in the subject for the session you're ending.

**The system checks:**

- Student is in the correct batch
- Student is enrolled in the subject
- Student is marked as active
- Student has a parent phone number

#### 3. **Check Session Data**

Verify that the session you're ending has:

- Valid batch and subject IDs
- Students actually enrolled in that batch-subject combination
- Some students who are absent (haven't marked attendance)

#### 4. **Debug Steps**

1. **Create a test session** with a batch and subject that has students
2. **Verify student data** - ensure at least one student has a parent phone number
3. **Mark attendance for only some students** - leave some students absent
4. **End the session** and check backend logs

#### 5. **Check Backend Logs**

When you end a session, you should see logs like:

```
AttendanceSessionService - Starting deactivation for session: [ID]
AttendanceSessionService - Found [N] enrolled students
AttendanceSessionService - Found [N] attendance records
AttendanceSessionService - Found [N] absent students with parent contacts
AttendanceSessionService - Sent absence notification for student: [Name]
```

#### 6. **SMS Service Status**

The system is configured to use **Twilio** for SMS (when twilio.enabled=true) or **Mock SMS** (when twilio.enabled=false or missing).

**Current Configuration:** Twilio is enabled and initialized successfully.

#### 7. **Testing with Mock SMS**

To test the notification logic without sending real SMS:

1. **Temporarily disable Twilio:** In `application.properties`, set:
   ```properties
   twilio.enabled=false
   ```
2. **Restart backend**
3. **Test session ending** - you should see mock SMS logs in the console
4. **Re-enable Twilio** when confirmed working

### Next Steps:

1. **Check your student data** - verify students have parent phone numbers
2. **Test the session ending process** and watch the backend console for detailed logs
3. **Report back** with the log output when you end a session

The enhanced logging will now show exactly what's happening during the session end process.
