ALTER TABLE fee_exemptions
    ADD COLUMN IF NOT EXISTS applies_to_all_subjects BOOLEAN DEFAULT TRUE;

UPDATE fee_exemptions
SET applies_to_all_subjects = TRUE
WHERE applies_to_all_subjects IS NULL;

ALTER TABLE fee_exemptions
    ALTER COLUMN applies_to_all_subjects SET DEFAULT TRUE;

ALTER TABLE fee_exemptions
    ALTER COLUMN applies_to_all_subjects SET NOT NULL;
