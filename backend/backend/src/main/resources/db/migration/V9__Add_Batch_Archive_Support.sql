-- Add archive support to batches table
-- This migration adds a boolean column to track whether a batch is archived

ALTER TABLE batches ADD COLUMN IF NOT EXISTS is_archived BOOLEAN NOT NULL DEFAULT FALSE;

