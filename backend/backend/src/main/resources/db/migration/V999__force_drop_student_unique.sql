-- Force remove old unique constraint if it exists

ALTER TABLE fee_exemptions
DROP CONSTRAINT IF EXISTS fee_exemptions_student_id_key;

DROP INDEX IF EXISTS fee_exemptions_student_id_key;