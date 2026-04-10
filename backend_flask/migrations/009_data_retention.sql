-- ============================================================
-- Migration 009: Data Retention — Postgres Cleanup Function
-- Run this in Supabase SQL Editor.
-- ============================================================
--
-- Creates a reusable database function that deletes old interview
-- data past a configurable retention window.
--
-- Usage (manual call in SQL editor):
--   SELECT * FROM cleanup_old_interviews(90);
--
-- Automatic scheduling via pg_cron (Supabase Pro / Enterprise only):
--   SELECT cron.schedule(
--     'cleanup-old-interviews',
--     '0 3 * * *',   -- daily at 03:00 UTC
--     $$SELECT cleanup_old_interviews(90)$$
--   );
--
-- To unschedule:
--   SELECT cron.unschedule('cleanup-old-interviews');
-- ============================================================


CREATE OR REPLACE FUNCTION cleanup_old_interviews(retention_days INT DEFAULT 90)
RETURNS TABLE(deleted_interviews BIGINT, deleted_messages BIGINT, deleted_sessions BIGINT, cutoff TIMESTAMPTZ)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_cutoff     TIMESTAMPTZ := NOW() - (retention_days || ' days')::INTERVAL;
  v_ids        UUID[];
  v_interviews BIGINT := 0;
  v_messages   BIGINT := 0;
  v_sessions   BIGINT := 0;
BEGIN
  -- Collect IDs of old completed / cancelled interviews
  SELECT ARRAY_AGG(id)
  INTO   v_ids
  FROM   interviews
  WHERE  status IN ('completed', 'cancelled')
    AND  created_at < v_cutoff;

  IF v_ids IS NULL OR ARRAY_LENGTH(v_ids, 1) = 0 THEN
    RETURN QUERY SELECT 0::BIGINT, 0::BIGINT, 0::BIGINT, v_cutoff;
    RETURN;
  END IF;

  -- Delete chat messages
  DELETE FROM chat_messages WHERE interview_id = ANY(v_ids);
  GET DIAGNOSTICS v_messages = ROW_COUNT;

  -- Delete interview sessions
  DELETE FROM interview_sessions WHERE interview_id = ANY(v_ids);
  GET DIAGNOSTICS v_sessions = ROW_COUNT;

  -- Delete interviews (parent)
  DELETE FROM interviews WHERE id = ANY(v_ids);
  GET DIAGNOSTICS v_interviews = ROW_COUNT;

  RAISE NOTICE '[retention] Deleted % interviews, % messages, % sessions (cutoff: %)',
    v_interviews, v_messages, v_sessions, v_cutoff;

  RETURN QUERY SELECT v_interviews, v_messages, v_sessions, v_cutoff;
END;
$$;


-- Optional: add a metadata column to interviews so retention can be
-- customised per user / plan (future use).
-- ALTER TABLE interviews ADD COLUMN IF NOT EXISTS retain_until DATE;

-- Grant execute to authenticated role (required if using RPC from client)
GRANT EXECUTE ON FUNCTION cleanup_old_interviews(INT) TO service_role;
