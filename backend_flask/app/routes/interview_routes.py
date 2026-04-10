"""Interview API routes."""
from flask import Blueprint, g, request
from app.middleware.auth import require_auth
from app.services.interview_service import InterviewService
from app.utils.responses import success_response, error_response, APIError
from app.utils.validation import (
    validate_request,
    CreateInterviewSchema,
    UpdateInterviewStatusSchema,
    UpdateInterviewScoresSchema
)

interview_bp = Blueprint('interviews', __name__, url_prefix='/api/interviews')


@interview_bp.route('/job-roles', methods=['GET'])
@require_auth
def get_job_roles():
    """Get active job roles from the admin-managed table for interview selection."""
    try:
        from app.config.supabase_client import supabase_admin
        category = request.args.get('category')
        query = supabase_admin.table('job_roles').select('id, title, category, required_skills').eq('is_active', True)
        if category:
            query = query.eq('category', category)
        response = query.order('category').order('title').execute()
        roles = [{
            'id': r['id'],
            'title': r['title'],
            'category': r.get('category') or 'General',
            'requiredSkills': r.get('required_skills', []),
        } for r in (response.data or [])]
        return success_response({'roles': roles, 'total': len(roles)})
    except Exception as e:
        return error_response(f'Failed to get job roles: {str(e)}', 500)


@interview_bp.route('', methods=['POST'])
@require_auth
@validate_request(CreateInterviewSchema)
def create_interview():
    """Create a new interview session."""
    try:
        # Check free-tier interview limit
        from app.services.subscription_service import SubscriptionService
        if not SubscriptionService.is_premium(g.user['id']):
            monthly_count = InterviewService.count_monthly_interviews(g.user['id'])
            if monthly_count >= 5:
                return error_response(
                    'Free tier limit reached. You have used all 5 interviews this month. '
                    'Upgrade to Premium for unlimited interviews.',
                    403
                )

        data = request.validated_data
        interview = InterviewService.create_interview(
            g.user['id'],
            data['jobRole'],
            data.get('interviewType', 'general'),
        )
        return success_response(interview, 'Interview created successfully', 201)

    except APIError as e:
        return error_response(e.message, e.status_code)
    except Exception as e:
        return error_response(f'Internal server error: {str(e)}', 500)


@interview_bp.route('', methods=['GET'])
@require_auth
def get_user_interviews():
    """Get all interviews for the authenticated user."""
    try:
        interviews = InterviewService.get_user_interviews(g.user['id'])
        return success_response({'interviews': interviews, 'count': len(interviews)})

    except APIError as e:
        return error_response(e.message, e.status_code)
    except Exception as e:
        return error_response(f'Internal server error: {str(e)}', 500)


@interview_bp.route('/<interview_id>', methods=['GET'])
@require_auth
def get_interview(interview_id):
    """Get a specific interview by ID."""
    try:
        interview = InterviewService.get_interview_by_id(interview_id, g.user['id'])
        return success_response(interview)

    except APIError as e:
        return error_response(e.message, e.status_code)
    except Exception as e:
        return error_response(f'Internal server error: {str(e)}', 500)


@interview_bp.route('/<interview_id>/status', methods=['PATCH'])
@require_auth
@validate_request(UpdateInterviewStatusSchema)
def update_interview_status(interview_id):
    """Update interview status."""
    try:
        data = request.validated_data
        interview = InterviewService.update_interview_status(
            interview_id,
            g.user['id'],
            data['status']
        )
        return success_response(interview, f"Interview status updated to {data['status']}")

    except APIError as e:
        return error_response(e.message, e.status_code)
    except Exception as e:
        return error_response(f'Internal server error: {str(e)}', 500)


@interview_bp.route('/<interview_id>/scores', methods=['PATCH'])
@require_auth
@validate_request(UpdateInterviewScoresSchema)
def update_interview_scores(interview_id):
    """Update interview scores."""
    try:
        scores = request.validated_data
        interview = InterviewService.update_interview_scores(interview_id, scores)
        return success_response(interview, 'Scores updated successfully')

    except APIError as e:
        return error_response(e.message, e.status_code)
    except Exception as e:
        return error_response(f'Internal server error: {str(e)}', 500)


@interview_bp.route('/<interview_id>/calculate-scores', methods=['POST'])
@require_auth
def calculate_scores(interview_id):
    """Calculate and update interview scores."""
    try:
        # Verify user owns the interview
        InterviewService.get_interview_by_id(interview_id, g.user['id'])

        # Calculate scores
        InterviewService.calculate_scores(interview_id)

        # Fetch updated interview
        interview = InterviewService.get_interview_by_id(interview_id, g.user['id'])

        return success_response(interview, 'Scores calculated successfully')

    except APIError as e:
        return error_response(e.message, e.status_code)
    except Exception as e:
        return error_response(f'Internal server error: {str(e)}', 500)


@interview_bp.route('/<interview_id>', methods=['DELETE'])
@require_auth
def delete_interview(interview_id):
    """Delete an interview."""
    try:
        InterviewService.delete_interview(interview_id, g.user['id'])
        return success_response(None, 'Interview deleted successfully')

    except APIError as e:
        return error_response(e.message, e.status_code)
    except Exception as e:
        return error_response(f'Internal server error: {str(e)}', 500)


@interview_bp.route('/stats/summary', methods=['GET'])
@require_auth
def get_user_statistics():
    """Get user statistics."""
    try:
        stats = InterviewService.get_user_statistics(g.user['id'])
        return success_response(stats)

    except APIError as e:
        return error_response(e.message, e.status_code)
    except Exception as e:
        return error_response(f'Internal server error: {str(e)}', 500)
