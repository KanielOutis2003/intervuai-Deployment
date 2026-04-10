"""AI Analysis and Feedback routes."""

from flask import Blueprint, request
from app.services.analysis_service import AnalysisService
from app.utils.validation import validate_request, NLPAnalysisSchema, GenerateFeedbackSchema
from app.utils.responses import success_response, error_response, APIError
from app.middleware.auth import require_auth

analysis_bp = Blueprint('analysis', __name__, url_prefix='/api/analysis')


@analysis_bp.route('/nlp', methods=['POST'])
@require_auth
@validate_request(NLPAnalysisSchema)
def analyze_nlp():
    """
    Run NLP analysis on a response text.

    Request body:
        - interviewId: UUID of the interview
        - text: Text to analyze
        - questionId: Optional question UUID

    Returns:
        201: NLP analysis results (sentiment, filler words, clarity, etc.)
    """
    try:
        data = request.validated_data
        analysis = AnalysisService.analyze_nlp(
            interview_id=str(data['interviewId']),
            text=data['text'],
            question_id=str(data['questionId']) if data.get('questionId') else None
        )
        return success_response(analysis, 'NLP analysis completed', 201)
    except APIError as e:
        return error_response(e.message, e.status_code)
    except Exception as e:
        return error_response(f'NLP analysis failed: {str(e)}', 500)


@analysis_bp.route('/nlp/interview/<interview_id>', methods=['GET'])
@require_auth
def get_interview_analyses(interview_id):
    """
    Get all NLP analyses for an interview.

    Path params:
        - interview_id: UUID of the interview

    Returns:
        200: List of NLP analyses
    """
    try:
        analyses = AnalysisService.get_interview_analyses(interview_id)
        return success_response({
            'analyses': analyses,
            'count': len(analyses)
        }, 'NLP analyses retrieved successfully')
    except APIError as e:
        return error_response(e.message, e.status_code)
    except Exception as e:
        return error_response(f'Failed to fetch analyses: {str(e)}', 500)


@analysis_bp.route('/feedback/generate', methods=['POST'])
@require_auth
@validate_request(GenerateFeedbackSchema)
def generate_feedback():
    """
    Generate AI feedback for a user's response.

    Request body:
        - interviewId: UUID of the interview
        - questionId: UUID of the question
        - questionText: The interview question
        - userResponse: The user's response
        - jobRole: The job role
        - expectedKeywords: Optional list of expected keywords

    Returns:
        201: AI-generated feedback with scores
    """
    try:
        data = request.validated_data
        feedback = AnalysisService.generate_ai_feedback(
            interview_id=str(data['interviewId']),
            question_id=str(data['questionId']),
            question_text=data['questionText'],
            user_response=data['userResponse'],
            job_role=data['jobRole'],
            expected_keywords=data.get('expectedKeywords', [])
        )
        return success_response(feedback, 'AI feedback generated', 201)
    except APIError as e:
        return error_response(e.message, e.status_code)
    except Exception as e:
        return error_response(f'Feedback generation failed: {str(e)}', 500)


@analysis_bp.route('/interview/<interview_id>/summary', methods=['POST'])
@require_auth
def generate_summary(interview_id):
    """
    Generate a session summary for an interview.

    Path params:
        - interview_id: UUID of the interview

    Returns:
        201: Session summary with strengths, improvements, recommendations
    """
    try:
        summary = AnalysisService.generate_session_summary(interview_id)
        return success_response(summary, 'Session summary generated', 201)
    except APIError as e:
        return error_response(e.message, e.status_code)
    except Exception as e:
        return error_response(f'Summary generation failed: {str(e)}', 500)


@analysis_bp.route('/interview/<interview_id>/summary', methods=['GET'])
@require_auth
def get_summary(interview_id):
    """
    Get session summary for an interview.

    Path params:
        - interview_id: UUID of the interview

    Returns:
        200: Session summary data
        404: No summary found
    """
    try:
        summary = AnalysisService.get_session_summary(interview_id)
        if not summary:
            return error_response('No summary found for this interview', 404)
        return success_response(summary, 'Session summary retrieved')
    except APIError as e:
        return error_response(e.message, e.status_code)
    except Exception as e:
        return error_response(f'Failed to fetch summary: {str(e)}', 500)


@analysis_bp.route('/interview/<interview_id>/scores', methods=['POST'])
@require_auth
def calculate_scores(interview_id):
    """
    Calculate comprehensive scores for an interview.

    Path params:
        - interview_id: UUID of the interview

    Returns:
        200: Comprehensive score breakdown (verbal, NLP, non-verbal, overall)
    """
    try:
        scores = AnalysisService.calculate_comprehensive_scores(interview_id)
        return success_response(scores, 'Scores calculated successfully')
    except APIError as e:
        return error_response(e.message, e.status_code)
    except Exception as e:
        return error_response(f'Score calculation failed: {str(e)}', 500)
