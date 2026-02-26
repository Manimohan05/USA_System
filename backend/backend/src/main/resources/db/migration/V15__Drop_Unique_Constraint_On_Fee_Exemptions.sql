-- V15__Drop_Unique_Constraint_On_Fee_Exemptions.sql
-- Drop the remaining unique constraint on student_id in fee_exemptions
ALTER TABLE fee_exemptions DROP CONSTRAINT IF EXISTS fee_exemptions_student_id_key;
