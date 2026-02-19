-- Add archive support to subjects table
-- This migration adds a boolean column to track whether a subject is archived

ALTER TABLE subjects ADD COLUMN IF NOT EXISTS is_archived BOOLEAN NOT NULL DEFAULT FALSE;
