ALTER TABLE fee_exemptions
    ADD COLUMN IF NOT EXISTS applies_to_all_subjects BOOLEAN NOT NULL DEFAULT TRUE;

CREATE TABLE IF NOT EXISTS fee_exemption_subjects (
    exemption_id UUID NOT NULL,
    subject_id INTEGER NOT NULL,
    PRIMARY KEY (exemption_id, subject_id),
    CONSTRAINT fk_fee_exemption_subjects_exemption
        FOREIGN KEY (exemption_id)
        REFERENCES fee_exemptions (id)
        ON DELETE CASCADE,
    CONSTRAINT fk_fee_exemption_subjects_subject
        FOREIGN KEY (subject_id)
        REFERENCES subjects (id)
        ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_fee_exemption_subjects_subject_id
    ON fee_exemption_subjects (subject_id);
