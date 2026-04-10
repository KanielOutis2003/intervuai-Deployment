-- Migration 007: Add interview_type column to interviews table
-- Run this in Supabase SQL Editor

ALTER TABLE interviews ADD COLUMN IF NOT EXISTS interview_type VARCHAR(50) DEFAULT 'general';

COMMENT ON COLUMN interviews.interview_type IS 'Interview question focus: general, technical, behavioral, situational, mixed';

CREATE INDEX IF NOT EXISTS idx_interviews_type ON interviews(interview_type);
