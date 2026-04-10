-- Migration 011: Add user blocking and activity tracking
-- Run this in Supabase SQL Editor

-- Add blocking support
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS is_blocked BOOLEAN DEFAULT false;

-- Add activity tracking
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS last_active_at TIMESTAMP WITH TIME ZONE;

-- Indexes for efficient admin queries
CREATE INDEX IF NOT EXISTS idx_user_profiles_is_blocked ON user_profiles(is_blocked);
CREATE INDEX IF NOT EXISTS idx_user_profiles_last_active ON user_profiles(last_active_at);
