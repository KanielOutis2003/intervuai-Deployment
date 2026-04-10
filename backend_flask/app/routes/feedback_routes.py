"""Feedback API routes."""
from flask import Blueprint, g, request
from app.middleware.auth import require_auth
from app.services.feedback_service import FeedbackService, NonVerbalMetricsService
from app.services.interview_service import InterviewService
from app.services.analysis_service import AnalysisService
from app.utils.responses import success_response, error_response, APIError
from app.utils.validation import validate_request, CreateFeedbackSchema, RecordNonVerbalMetricSchema, RecordAggregatedNonVerbalSchema

feedback_bp = Blueprint('feedback', __name__, url_prefix='/api/feedback')


@feedback_bp.route('', methods=['POST'])
@require_auth
@validate_request(CreateFeedbackSchema)
def create_feedback():
    """Create feedback for a question response."""
    try:
        data = request.validated_data

        # Verify user owns the interview
        InterviewService.get_interview_by_id(data['interviewId'], g.user['id'])

        feedback = FeedbackService.create_feedback(data)
        return success_response(feedback, 'Feedback created successfully', 201)

    except APIError as e:
        return error_response(e.message, e.status_code)
    except Exception as e:
        return error_response(f'Internal server error: {str(e)}', 500)


@feedback_bp.route('/<feedback_id>', methods=['GET'])
@require_auth
def get_feedback(feedback_id):
    """Get feedback by ID."""
    try:
        feedback = FeedbackService.get_feedback_by_id(feedback_id)
        return success_response(feedback)

    except APIError as e:
        return error_response(e.message, e.status_code)
    except Exception as e:
        return error_response(f'Internal server error: {str(e)}', 500)


@feedback_bp.route('/interview/<interview_id>', methods=['GET'])
@require_auth
def get_interview_feedback(interview_id):
    """Get all feedback for an interview."""
    try:
        # Verify user owns the interview
        InterviewService.get_interview_by_id(interview_id, g.user['id'])

        feedback = FeedbackService.get_interview_feedback(interview_id)
        return success_response({'feedback': feedback, 'count': len(feedback)})

    except APIError as e:
        return error_response(e.message, e.status_code)
    except Exception as e:
        return error_response(f'Internal server error: {str(e)}', 500)


@feedback_bp.route('/question/<question_id>', methods=['GET'])
@require_auth
def get_question_feedback(question_id):
    """Get feedback for a specific question."""
    try:
        feedback = FeedbackService.get_question_feedback(question_id)
        return success_response(feedback)

    except APIError as e:
        return error_response(e.message, e.status_code)
    except Exception as e:
        return error_response(f'Internal server error: {str(e)}', 500)


@feedback_bp.route('/interview/<interview_id>/average-scores', methods=['GET'])
@require_auth
def get_average_scores(interview_id):
    """Get average scores for an interview."""
    try:
        # Verify user owns the interview
        InterviewService.get_interview_by_id(interview_id, g.user['id'])

        scores = FeedbackService.get_average_scores(interview_id)
        return success_response(scores)

    except APIError as e:
        return error_response(e.message, e.status_code)
    except Exception as e:
        return error_response(f'Internal server error: {str(e)}', 500)


@feedback_bp.route('/interview/<interview_id>', methods=['DELETE'])
@require_auth
def delete_interview_feedback(interview_id):
    """Delete all feedback for an interview."""
    try:
        # Verify user owns the interview
        InterviewService.get_interview_by_id(interview_id, g.user['id'])

        FeedbackService.delete_interview_feedback(interview_id)
        return success_response(None, 'Feedback deleted successfully')

    except APIError as e:
        return error_response(e.message, e.status_code)
    except Exception as e:
        return error_response(f'Internal server error: {str(e)}', 500)


@feedback_bp.route('/non-verbal', methods=['POST'])
@require_auth
@validate_request(RecordNonVerbalMetricSchema)
def record_non_verbal_metric():
    """Record non-verbal metric data point."""
    try:
        data = request.validated_data

        # Verify user owns the interview
        InterviewService.get_interview_by_id(data['interviewId'], g.user['id'])

        NonVerbalMetricsService.record_metric(data)
        return success_response(None, 'Non-verbal metric recorded successfully', 201)

    except APIError as e:
        return error_response(e.message, e.status_code)
    except Exception as e:
        return error_response(f'Internal server error: {str(e)}', 500)


@feedback_bp.route('/non-verbal/interview/<interview_id>', methods=['GET'])
@require_auth
def get_non_verbal_metrics(interview_id):
    """Get non-verbal metrics for an interview."""
    try:
        # Verify user owns the interview
        InterviewService.get_interview_by_id(interview_id, g.user['id'])

        metrics = NonVerbalMetricsService.get_interview_metrics(interview_id)
        return success_response({'metrics': metrics, 'count': len(metrics)})

    except APIError as e:
        return error_response(e.message, e.status_code)
    except Exception as e:
        return error_response(f'Internal server error: {str(e)}', 500)


@feedback_bp.route('/record', methods=['POST'])
@require_auth
@validate_request(RecordAggregatedNonVerbalSchema)
def record_aggregated_non_verbal():
    """Record aggregated MediaPipe non-verbal data and recalculate weighted total score.

    Accepts:
        interviewId     — UUID
        eyeContactRatio — float 0-1 (from useVisionAI sessionBuffer average)
        postureScore    — float 0-100
        sampleCount     — int
        groqVerbalAvg   — float 0-100 (Groq 7-dimension average from frontend)
        sessionBuffer   — optional list of 30-second snapshot dicts

    Returns the updated composite score.
    """
    try:
        data = request.validated_data
        interview_id = str(data['interviewId'])

        # Verify ownership
        InterviewService.get_interview_by_id(interview_id, g.user['id'])

        result = AnalysisService.record_mediapipe_and_score(
            interview_id=interview_id,
            eye_contact_ratio=data.get('eyeContactRatio'),
            posture_score=data.get('postureScore'),
            sample_count=data.get('sampleCount', 0),
            groq_verbal_avg=data.get('groqVerbalAvg'),
            session_buffer=data.get('sessionBuffer'),
        )
        return success_response(result, 'Scores updated successfully')

    except APIError as e:
        return error_response(e.message, e.status_code)
    except Exception as e:
        return error_response(f'Internal server error: {str(e)}', 500)


@feedback_bp.route('/non-verbal/interview/<interview_id>/scores', methods=['GET'])
@require_auth
def get_non_verbal_scores(interview_id):
    """Calculate aggregated non-verbal scores."""
    try:
        # Verify user owns the interview
        InterviewService.get_interview_by_id(interview_id, g.user['id'])

        scores = NonVerbalMetricsService.calculate_non_verbal_scores(interview_id)
        return success_response(scores)

    except APIError as e:
        return error_response(e.message, e.status_code)
    except Exception as e:
        return error_response(f'Internal server error: {str(e)}', 500)
