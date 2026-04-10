-- ============================================================
-- Migration 010b: Deduplicate resources + add unique constraint
-- Run this in Supabase SQL Editor AFTER 010_resources_enhance.sql
-- ============================================================

-- Step 1: Delete duplicate rows, keeping only the earliest inserted row
-- (lowest id / earliest created_at) for each title.
DELETE FROM resources
WHERE id NOT IN (
  SELECT DISTINCT ON (title) id
  FROM resources
  ORDER BY title, created_at ASC, id ASC
);

-- Step 2: Add a unique constraint on title so ON CONFLICT (title) works
--         in future migrations and prevents re-insertion.
ALTER TABLE resources
  ADD CONSTRAINT resources_title_unique UNIQUE (title);

-- Verify: check counts
SELECT resource_type, COUNT(*) AS count
FROM resources
GROUP BY resource_type
ORDER BY resource_type;
