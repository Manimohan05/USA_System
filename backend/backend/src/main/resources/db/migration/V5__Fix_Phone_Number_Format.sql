-- Fix existing phone numbers to international format
-- This migration updates any existing phone numbers to proper +94XXXXXXXXX format

-- Update phone numbers that are in 0XXXXXXXXX format (10 digits starting with 0)
UPDATE students 
SET parent_phone = CONCAT('+94', SUBSTRING(parent_phone FROM 2))
WHERE parent_phone ~ '^0[0-9]{9}$';

-- Update phone numbers that are in XXXXXXXXX format (9 digits, no leading 0)
UPDATE students 
SET parent_phone = CONCAT('+94', parent_phone)
WHERE parent_phone ~ '^[0-9]{9}$';

-- Update phone numbers that are in 94XXXXXXXXX format (11 digits starting with 94)
UPDATE students 
SET parent_phone = CONCAT('+', parent_phone)
WHERE parent_phone ~ '^94[0-9]{9}$';

-- Log the phone number update results
DO $$
DECLARE
    updated_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO updated_count FROM students WHERE parent_phone LIKE '+94%';
    RAISE NOTICE 'Phone number migration completed. % students now have properly formatted phone numbers.', updated_count;
END $$;