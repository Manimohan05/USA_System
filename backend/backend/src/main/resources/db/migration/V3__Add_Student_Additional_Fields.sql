-- V3: Add new student fields (address, nic, school, admission_date) and remove student_phone

-- Add new columns
ALTER TABLE students 
ADD COLUMN address VARCHAR(500),
ADD COLUMN nic VARCHAR(15), -- Optional field
ADD COLUMN school VARCHAR(255),
ADD COLUMN admission_date DATE;

-- Remove student_phone column (keeping only parent_phone as 'Phone No')
ALTER TABLE students DROP COLUMN IF EXISTS student_phone;

-- Set default values for existing students (if any)
UPDATE students 
SET address = 'Address to be updated',
    school = 'School to be updated',
    admission_date = CURRENT_DATE
WHERE address IS NULL;

-- Make the required columns NOT NULL (NIC remains nullable)
ALTER TABLE students 
ALTER COLUMN address SET NOT NULL,
ALTER COLUMN school SET NOT NULL,
ALTER COLUMN admission_date SET NOT NULL;

-- Add unique constraint for NIC only when it's not null
CREATE UNIQUE INDEX idx_students_nic ON students(nic) WHERE nic IS NOT NULL;