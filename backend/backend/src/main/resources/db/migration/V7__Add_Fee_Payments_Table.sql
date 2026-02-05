-- Create fee_payments table
CREATE TABLE fee_payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID NOT NULL,
    bill_number VARCHAR(100) NOT NULL,
    month INTEGER NOT NULL CHECK (month >= 1 AND month <= 12),
    year INTEGER NOT NULL CHECK (year >= 2020 AND year <= 2100),
    paid_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    -- Foreign key constraint
    CONSTRAINT fk_fee_payments_student 
        FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
    
    -- Unique constraint to prevent duplicate payments for same student/month/year
    CONSTRAINT uk_fee_payments_student_month_year 
        UNIQUE (student_id, month, year)
);

-- Create indexes for performance
CREATE INDEX idx_fee_payments_student_id ON fee_payments(student_id);
CREATE INDEX idx_fee_payments_month_year ON fee_payments(month, year);
CREATE INDEX idx_fee_payments_paid_at ON fee_payments(paid_at);

-- Add comments
COMMENT ON TABLE fee_payments IS 'Tracks fee payments made by students for specific months and years';
COMMENT ON COLUMN fee_payments.student_id IS 'Reference to the student who made the payment';
COMMENT ON COLUMN fee_payments.bill_number IS 'Bill or receipt number for the payment';
COMMENT ON COLUMN fee_payments.month IS 'Month for which fee was paid (1-12)';
COMMENT ON COLUMN fee_payments.year IS 'Year for which fee was paid';
COMMENT ON COLUMN fee_payments.paid_at IS 'Timestamp when payment was made/recorded';