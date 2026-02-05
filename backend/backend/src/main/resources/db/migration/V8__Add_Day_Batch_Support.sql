-- Add day batch support to batches table
-- This migration adds a boolean column to indicate if a batch is a day batch

ALTER TABLE batches ADD COLUMN is_day_batch BOOLEAN NOT NULL DEFAULT FALSE;

-- Remove the unique constraint on batch_year since we can now have both regular and day batches for the same year
ALTER TABLE batches DROP CONSTRAINT IF EXISTS batches_batch_year_key;

-- Add a composite unique constraint to allow one regular batch and one day batch per year
ALTER TABLE batches ADD CONSTRAINT batches_year_day_unique UNIQUE (batch_year, is_day_batch);