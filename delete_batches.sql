BEGIN;

-- Step 1: Delete attendance records
DELETE FROM attendance_records WHERE student_id IN (SELECT id FROM students WHERE batch_id = 30);

-- Step 2: Delete fee payments
DELETE FROM fee_payments WHERE student_id IN (SELECT id FROM students WHERE batch_id = 30);

-- Step 3: Delete fee records
DELETE FROM fee_records WHERE student_id IN (SELECT id FROM students WHERE batch_id = 30);

-- Step 4: Delete fee exemption subjects (join table)
DELETE FROM fee_exemption_subjects WHERE exemption_id IN (SELECT id FROM fee_exemptions WHERE student_id IN (SELECT id FROM students WHERE batch_id = 30));

-- Step 5: Delete fee exemptions
DELETE FROM fee_exemptions WHERE student_id IN (SELECT id FROM students WHERE batch_id = 30);

-- Step 6: Delete students
DELETE FROM students WHERE batch_id = 30;

-- Step 7: Delete the batch
DELETE FROM batches WHERE id = 30;

COMMIT;

-- Verify
SELECT 'Deleted. Active batches remaining:' as Status;
SELECT id, batch_year FROM batches WHERE is_archived = false;
