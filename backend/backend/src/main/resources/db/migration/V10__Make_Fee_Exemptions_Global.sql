DROP TABLE IF EXISTS fee_exemptions;

CREATE TABLE fee_exemptions (
    id UUID PRIMARY KEY,
    student_id UUID NOT NULL UNIQUE REFERENCES students(id),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL
);

CREATE INDEX idx_fee_exemptions_student_id ON fee_exemptions(student_id);
