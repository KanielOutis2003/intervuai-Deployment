"""Analytics routes for performance tracking, progress, and visualization."""

from flask import Blueprint, request, g
from app.middleware.auth import require_auth
from app.services.analytics_service import AnalyticsService
from app.services.openai_service import OpenAIService
from app.utils.responses import success_response, error_response, APIError

analytics_bp = Blueprint('analytics', __name__, url_prefix='/api/analytics')


@analytics_bp.route('/performance', methods=['GET'])
@require_auth
def get_performance():
    """Get performance analytics for current user."""
    try:
        period = request.args.get('period', 'all')
        data = AnalyticsService.get_performance_analytics(g.user['id'], period)
        return success_response(data)
    except APIError as e:
        return error_response(e.message, e.status_code)


@analytics_bp.route('/progress', methods=['GET'])
@require_auth
def get_progress():
    """Get progress tracking data."""
    try:
        data = AnalyticsService.get_progress_data(g.user['id'])
        return success_response(data)
    except APIError as e:
        return error_response(e.message, e.status_code)


@analytics_bp.route('/trends', methods=['GET'])
@require_auth
def get_trends():
    """Get trend data for improvement areas."""
    try:
        data = AnalyticsService.get_trends(g.user['id'])
        return success_response(data)
    except APIError as e:
        return error_response(e.message, e.status_code)


@analytics_bp.route('/report/generate', methods=['POST'])
@require_auth
def generate_report():
    """Generate an interview report."""
    try:
        body = request.get_json()
        interview_id = body.get('interviewId')
        if not interview_id:
            return error_response("interviewId is required", 400)

        # Get analytics data for the report
        from app.services.analysis_service import AnalysisService
        from app.config.supabase_client import supabase_admin

        # Get interview
        interview_resp = supabase_admin.table('interviews').select('*').eq('id', interview_id).eq('user_id', g.user['id']).execute()
        if not interview_resp.data:
            return error_response("Interview not found", 404)

        interview = interview_resp.data[0]

        # Get feedback
        feedback_resp = supabase_admin.table('feedback').select('*').eq('interview_id', interview_id).execute()
        feedback_list = [{
            'question': f.get('user_response', '')[:100],
            'response': f.get('user_response', ''),
            'score': f.get('relevance_score', 0),
            'feedback': f.get('ai_feedback', '')
        } for f in (feedback_resp.data or [])]

        report = OpenAIService.generate_interview_report(
            job_role=interview.get('job_role', 'Unknown'),
            overall_score=interview.get('overall_score', 0),
            verbal_score=interview.get('verbal_score', 0),
            non_verbal_score=interview.get('non_verbal_score', 0),
            feedback_list=feedback_list
        )

        return success_response({"report": report, "interviewId": interview_id}, status=201)
    except APIError as e:
        return error_response(e.message, e.status_code)


@analytics_bp.route('/visualization/scores', methods=['GET'])
@require_auth
def get_score_distribution():
    """Get score distribution data for visualization."""
    try:
        data = AnalyticsService.get_score_distribution(g.user['id'])
        return success_response(data)
    except APIError as e:
        return error_response(e.message, e.status_code)


@analytics_bp.route('/visualization/timeline', methods=['GET'])
@require_auth
def get_timeline():
    """Get timeline visualization data."""
    try:
        limit = request.args.get('limit', 20, type=int)
        data = AnalyticsService.get_timeline_data(g.user['id'], limit)
        return success_response(data)
    except APIError as e:
        return error_response(e.message, e.status_code)


@analytics_bp.route('/visualization/comparison', methods=['GET'])
@require_auth
def get_comparison():
    """Get comparison charts data (verbal vs non-verbal trends)."""
    try:
        data = AnalyticsService.get_trends(g.user['id'])
        return success_response(data)
    except APIError as e:
        return error_response(e.message, e.status_code)
