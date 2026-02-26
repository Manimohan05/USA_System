-- V14__Allow_Multiple_Fee_Exemptions.sql
-- Remove unique constraint on student_id in fee_exemptions

ALTER TABLE fee_exemptions DROP CONSTRAINT IF EXISTS fee_exemptions_student_id_key;
-- If the constraint has a different name, you may need to check pg_constraint for the actual name.
-- Remove UNIQUE from student_id if present
-- (No need to recreate the table, just drop the constraint)
