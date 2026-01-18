-- V2: Add index numbers to students and attendance sessions

-- Add index_number column to existing students table
ALTER TABLE students ADD COLUMN index_number VARCHAR(10);

-- Generate unique index numbers for existing students (format: IDX001, IDX002, etc.)
WITH numbered_students AS (
  SELECT id, ROW_NUMBER() OVER (ORDER BY student_id_code) as row_num
  FROM students
)
UPDATE students 
SET index_number = 'IDX' || LPAD(numbered_students.row_num::text, 3, '0')
FROM numbered_students 
WHERE students.id = numbered_students.id;

-- Make index_number NOT NULL and UNIQUE after updating existing records
ALTER TABLE students ALTER COLUMN index_number SET NOT NULL;
ALTER TABLE students ADD CONSTRAINT students_index_number_unique UNIQUE (index_number);

-- Create attendance_sessions table
CREATE TABLE attendance_sessions (
    id BIGSERIAL PRIMARY KEY,
    batch_id INTEGER NOT NULL REFERENCES batches(id),
    subject_id INTEGER NOT NULL REFERENCES subjects(id),
    session_date DATE NOT NULL,
    created_by INTEGER NOT NULL REFERENCES admins(id),
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(batch_id, subject_id, session_date)
);