"""Question API routes."""
from flask import Blueprint, g, request
from app.middleware.auth import require_auth
from app.services.question_service import QuestionService
from app.services.interview_service import InterviewService
from app.utils.responses import success_response, error_response, APIError
from app.utils.validation import validate_request, CreateQuestionSchema, BulkCreateQuestionsSchema

question_bp = Blueprint('questions', __name__, url_prefix='/api/questions')


@question_bp.route('', methods=['POST'])
@require_auth
@validate_request(CreateQuestionSchema)
def create_question():
    """Create a new question."""
    try:
        data = request.validated_data

        # Verify user owns the interview
        InterviewService.get_interview_by_id(str(data['interviewId']), g.user['id'])

        question = QuestionService.create_question(data)
        return success_response(question, 'Question created successfully', 201)

    except APIError as e:
        return error_response(e.message, e.status_code)
    except Exception as e:
        return error_response(f'Internal server error: {str(e)}', 500)


@question_bp.route('/bulk', methods=['POST'])
@require_auth
@validate_request(BulkCreateQuestionsSchema)
def create_bulk_questions():
    """Create multiple questions."""
    try:
        data = request.validated_data

        # Verify user owns the interview
        InterviewService.get_interview_by_id(str(data['interviewId']), g.user['id'])

        questions = QuestionService.create_multiple_questions(
            str(data['interviewId']),
            data['questions']
        )

        return success_response(
            {'questions': questions, 'count': len(questions)},
            'Questions created successfully',
            201
        )

    except APIError as e:
        return error_response(e.message, e.status_code)
    except Exception as e:
        return error_response(f'Internal server error: {str(e)}', 500)


@question_bp.route('/interview/<interview_id>', methods=['GET'])
@require_auth
def get_interview_questions(interview_id):
    """Get all questions for an interview."""
    try:
        # Verify user owns the interview
        InterviewService.get_interview_by_id(interview_id, g.user['id'])

        questions = QuestionService.get_interview_questions(interview_id)
        return success_response({'questions': questions, 'count': len(questions)})

    except APIError as e:
        return error_response(e.message, e.status_code)
    except Exception as e:
        return error_response(f'Internal server error: {str(e)}', 500)


@question_bp.route('/<question_id>', methods=['GET'])
@require_auth
def get_question(question_id):
    """Get a specific question."""
    try:
        question = QuestionService.get_question_by_id(question_id)
        return success_response(question)

    except APIError as e:
        return error_response(e.message, e.status_code)
    except Exception as e:
        return error_response(f'Internal server error: {str(e)}', 500)


@question_bp.route('/interview/<interview_id>/next', methods=['GET'])
@require_auth
def get_next_question(interview_id):
    """Get the next question in an interview."""
    try:
        # Verify user owns the interview
        InterviewService.get_interview_by_id(interview_id, g.user['id'])

        current_order = int(request.args.get('currentOrder', 0))
        next_question = QuestionService.get_next_question(interview_id, current_order)

        if not next_question:
            return success_response(None, 'No more questions available')

        return success_response(next_question)

    except APIError as e:
        return error_response(e.message, e.status_code)
    except Exception as e:
        return error_response(f'Internal server error: {str(e)}', 500)


@question_bp.route('/interview/<interview_id>/count', methods=['GET'])
@require_auth
def get_question_count(interview_id):
    """Get total question count."""
    try:
        # Verify user owns the interview
        InterviewService.get_interview_by_id(interview_id, g.user['id'])

        count = QuestionService.get_question_count(interview_id)
        return success_response({'count': count})

    except APIError as e:
        return error_response(e.message, e.status_code)
    except Exception as e:
        return error_response(f'Internal server error: {str(e)}', 500)


@question_bp.route('/interview/<interview_id>', methods=['DELETE'])
@require_auth
def delete_interview_questions(interview_id):
    """Delete all questions for an interview."""
    try:
        # Verify user owns the interview
        InterviewService.get_interview_by_id(interview_id, g.user['id'])

        QuestionService.delete_interview_questions(interview_id)
        return success_response(None, 'Questions deleted successfully')

    except APIError as e:
        return error_response(e.message, e.status_code)
    except Exception as e:
        return error_response(f'Internal server error: {str(e)}', 500)
