-- V6: Add unique constraint to prevent duplicate attendance marking
-- This ensures a student can only mark attendance once per subject per day at the database level

-- First, clean up any existing duplicates (keep the earliest record)
DELETE FROM attendance_records ar1
WHERE EXISTS (
    SELECT 1 FROM attendance_records ar2
    WHERE ar1.student_id = ar2.student_id
    AND ar1.subject_id = ar2.subject_id
    AND DATE(ar1.attendance_timestamp) = DATE(ar2.attendance_timestamp)
    AND ar1.id > ar2.id
);

-- Add a new column to store the date part separately for unique constraint
ALTER TABLE attendance_records ADD COLUMN attendance_date DATE;

-- Update the new column with the date part of existing attendance timestamps
UPDATE attendance_records SET attendance_date = DATE(attendance_timestamp);

-- Make the new column NOT NULL
ALTER TABLE attendance_records ALTER COLUMN attendance_date SET NOT NULL;

-- Create a unique index on student_id, subject_id, and attendance date
-- This prevents duplicate entries at the database level
CREATE UNIQUE INDEX idx_attendance_unique_per_day 
ON attendance_records (student_id, subject_id, attendance_date);
