-- Phase 4: Analytics & Reporting Migration
-- Creates views for analytics dashboards

-- User progress dashboard view
CREATE OR REPLACE VIEW user_progress_dashboard AS
SELECT
    i.user_id,
    COUNT(i.id) AS total_interviews,
    COUNT(CASE WHEN i.status = 'completed' THEN 1 END) AS completed_interviews,
    COUNT(CASE WHEN i.status = 'in_progress' THEN 1 END) AS in_progress_interviews,
    ROUND(AVG(CASE WHEN i.status = 'completed' THEN i.overall_score END)::numeric, 2) AS avg_overall_score,
    ROUND(AVG(CASE WHEN i.status = 'completed' THEN i.verbal_score END)::numeric, 2) AS avg_verbal_score,
    ROUND(AVG(CASE WHEN i.status = 'completed' THEN i.non_verbal_score END)::numeric, 2) AS avg_non_verbal_score,
    MAX(i.overall_score) AS best_score,
    MIN(CASE WHEN i.status = 'completed' AND i.overall_score > 0 THEN i.overall_score END) AS lowest_score,
    MAX(i.created_at) AS last_interview_date,
    MIN(i.created_at) AS first_interview_date
FROM interviews i
GROUP BY i.user_id;

-- System analytics view (admin)
CREATE OR REPLACE VIEW system_analytics AS
SELECT
    COUNT(DISTINCT i.user_id) AS total_users,
    COUNT(i.id) AS total_interviews,
    COUNT(CASE WHEN i.status = 'completed' THEN 1 END) AS completed_interviews,
    ROUND(AVG(CASE WHEN i.status = 'completed' THEN i.overall_score END)::numeric, 2) AS platform_avg_score,
    COUNT(CASE WHEN i.created_at >= NOW() - INTERVAL '7 days' THEN 1 END) AS interviews_last_7_days,
    COUNT(CASE WHEN i.created_at >= NOW() - INTERVAL '30 days' THEN 1 END) AS interviews_last_30_days
FROM interviews i;

-- Grant permissions on views
GRANT SELECT ON user_progress_dashboard TO authenticated;
GRANT SELECT ON system_analytics TO authenticated;
