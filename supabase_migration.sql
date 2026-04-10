-- ============================================================
-- IntervuAI — Supabase Schema Migration
-- Run this in the Supabase SQL Editor (Database → SQL Editor)
-- ============================================================

-- ────────────────────────────────────────────────────────────
-- 1. user_profiles: add is_premium, target_industry, resume_url
-- ────────────────────────────────────────────────────────────
ALTER TABLE public.user_profiles
  ADD COLUMN IF NOT EXISTS is_premium        BOOLEAN     NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS target_industry   TEXT,
  ADD COLUMN IF NOT EXISTS experience_level  TEXT CHECK (experience_level IN ('entry','mid','senior','executive')),
  ADD COLUMN IF NOT EXISTS resume_url        TEXT;

-- Keep is_premium in sync with role column (convenience column)
-- Trigger: auto-set is_premium when role changes
CREATE OR REPLACE FUNCTION public.sync_is_premium()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.is_premium := (NEW.role = 'premium' OR NEW.role = 'admin');
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_is_premium ON public.user_profiles;
CREATE TRIGGER trg_sync_is_premium
  BEFORE INSERT OR UPDATE OF role ON public.user_profiles
  FOR EACH ROW EXECUTE FUNCTION public.sync_is_premium();

-- Backfill existing rows
UPDATE public.user_profiles
SET is_premium = (role = 'premium' OR role = 'admin')
WHERE is_premium IS DISTINCT FROM (role = 'premium' OR role = 'admin');


-- ────────────────────────────────────────────────────────────
-- 2. non_verbal_metrics: add MediaPipe aggregated columns
-- ────────────────────────────────────────────────────────────
ALTER TABLE public.non_verbal_metrics
  ADD COLUMN IF NOT EXISTS eye_contact_avg  NUMERIC(5,2),   -- MediaPipe eye contact % (0-100)
  ADD COLUMN IF NOT EXISTS posture_score    NUMERIC(5,2),   -- MediaPipe posture score (0-100)
  ADD COLUMN IF NOT EXISTS sample_count     INTEGER  DEFAULT 0,  -- number of 30-second windows
  ADD COLUMN IF NOT EXISTS session_buffer   JSONB    DEFAULT '[]'::jsonb;  -- full 30-sec snapshots


-- ────────────────────────────────────────────────────────────
-- 3. interviews: add hiring_recommendation column
-- ────────────────────────────────────────────────────────────
ALTER TABLE public.interviews
  ADD COLUMN IF NOT EXISTS hiring_recommendation TEXT
    CHECK (hiring_recommendation IN ('strong_hire','hire','maybe','no_hire'));


-- ────────────────────────────────────────────────────────────
-- 4. RLS Policies
-- ────────────────────────────────────────────────────────────

-- 4a. audit_logs — admin-only SELECT
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "audit_logs_admin_only"  ON public.audit_logs;
CREATE POLICY "audit_logs_admin_only"
  ON public.audit_logs
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE user_id = auth.uid()
        AND role = 'admin'
    )
  );

-- 4b. chat_messages — users can only SELECT/INSERT their own messages (AES-128 encrypted)
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "chat_messages_own_select" ON public.chat_messages;
CREATE POLICY "chat_messages_own_select"
  ON public.chat_messages
  FOR SELECT
  USING (
    interview_id IN (
      SELECT id FROM public.interviews
      WHERE user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "chat_messages_own_insert" ON public.chat_messages;
CREATE POLICY "chat_messages_own_insert"
  ON public.chat_messages
  FOR INSERT
  WITH CHECK (
    interview_id IN (
      SELECT id FROM public.interviews
      WHERE user_id = auth.uid()
    )
  );

-- 4c. non_verbal_metrics — users can only read/write their own
ALTER TABLE public.non_verbal_metrics ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "non_verbal_metrics_own" ON public.non_verbal_metrics;
CREATE POLICY "non_verbal_metrics_own"
  ON public.non_verbal_metrics
  FOR ALL
  USING (
    interview_id IN (
      SELECT id FROM public.interviews
      WHERE user_id = auth.uid()
    )
  );

-- 4d. Resources — only published rows are visible; write access requires admin role
-- Note: premium-only enforcement is handled at the Flask service layer, not RLS.
-- The resources table has no 'limits' column — columns are:
--   id, title, description, content, category, tags, resource_type,
--   difficulty, read_count, is_published, created_at, updated_at, created_by
ALTER TABLE public.resources ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "resources_select_published" ON public.resources;
DROP POLICY IF EXISTS "resources_admin_write"       ON public.resources;
-- Drop old names in case they exist from a previous run
DROP POLICY IF EXISTS "resources_free_access"       ON public.resources;
DROP POLICY IF EXISTS "resources_premium_access"    ON public.resources;

-- Anyone authenticated can read published resources
CREATE POLICY "resources_select_published"
  ON public.resources
  FOR SELECT
  USING (is_published = true);

-- Only admins can insert / update / delete resources
CREATE POLICY "resources_admin_write"
  ON public.resources
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE user_id = auth.uid()
        AND role = 'admin'
    )
  );


-- ────────────────────────────────────────────────────────────
-- Done
-- ────────────────────────────────────────────────────────────
