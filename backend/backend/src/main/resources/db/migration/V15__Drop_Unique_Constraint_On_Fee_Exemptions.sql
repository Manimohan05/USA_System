-- V15__Drop_Unique_Constraint_On_Fee_Exemptions.sql
-- Drop the remaining unique constraint on student_id in fee_exemptions
ALTER TABLE fee_exemptions DROP CONSTRAINT IF EXISTS ukbb5a5k5to62hiv07p5f35uerx;
