"""Session management routes."""

from flask import Blueprint, request, g
from app.services.session_service import SessionService
from app.services.whisper_service import WhisperService
from app.utils.validation import validate_request, StartSessionSchema, SendMessageSchema
from app.utils.responses import success_response, error_response, APIError
from app.middleware.auth import require_auth

session_bp = Blueprint('session', __name__, url_prefix='/api/sessions')


@session_bp.route('/start', methods=['POST'])
@require_auth
@validate_request(StartSessionSchema)
def start_session():
    """Start a new interview session (idempotent)."""
    try:
        data = request.validated_data
        interview_id = str(data['interviewId'])
        session = SessionService.start_session(
            interview_id=interview_id,
            session_data=data.get('sessionData')
        )

        return success_response(session, 'Session started successfully', 201)
    except APIError as e:
        return error_response(e.message, e.status_code)
    except Exception as e:
        return error_response(f'Failed to start session: {str(e)}', 500)


@session_bp.route('/<session_id>/end', methods=['POST'])
@require_auth
def end_session(session_id):
    """End an interview session and trigger auto-scoring."""
    try:
        session = SessionService.end_session(session_id)

        # Best-effort: only auto-calculate legacy scores if Groq hasn't already saved scores.
        # calculate_comprehensive_scores uses feedback/nlp_analyses/non_verbal_metrics tables
        # which are empty in the Groq flow — running it would overwrite real scores with 0.
        try:
            from app.services.analysis_service import AnalysisService
            from app.config.supabase_client import supabase_admin
            interview_id = session.get('interviewId')
            if interview_id:
                iv = supabase_admin.table('interviews')\
                    .select('overall_score')\
                    .eq('id', interview_id)\
                    .single()\
                    .execute()
                # Only run legacy calculation if no Groq score has been saved yet
                if iv.data and iv.data.get('overall_score') is None:
                    AnalysisService.calculate_comprehensive_scores(interview_id)
                AnalysisService.generate_session_summary(interview_id)
        except Exception:
            pass

        return success_response(session, 'Session ended successfully')
    except APIError as e:
        return error_response(e.message, e.status_code)
    except Exception as e:
        return error_response(f'Failed to end session: {str(e)}', 500)


@session_bp.route('/<session_id>', methods=['GET'])
@require_auth
def get_session(session_id):
    """Get session details."""
    try:
        session = SessionService.get_session(session_id)
        return success_response(session, 'Session retrieved successfully')
    except APIError as e:
        return error_response(e.message, e.status_code)
    except Exception as e:
        return error_response(f'Failed to get session: {str(e)}', 500)


@session_bp.route('/<interview_id>/message', methods=['POST'])
@require_auth
@validate_request(SendMessageSchema)
def send_message(interview_id):
    """
    Send a user message and get an AI interviewer response.

    Primary AI: Groq via GroqService.chat() — maintains in-memory session history.
    Every message is persisted to Supabase immediately.
    """
    try:
        data = request.validated_data

        # Persist user message immediately
        user_message = SessionService.send_message(
            interview_id=interview_id,
            role=data['role'],
            content=data['content'],
            metadata=data.get('metadata')
        )

        # persist_only=True: save message to DB without triggering AI generation
        if data['role'] != 'user' or data.get('persist_only', False):
            return success_response({'message': user_message}, 'Message sent successfully', 201)

        # ── Generate AI response via Gemini ──────────────────────────────────
        ai_message = None
        ai_error = None

        try:
            from app.services.groq_service import GroqService

            result = GroqService.chat(
                session_id=interview_id,
                user_message=data['content'],
            )
            ai_response_text = result['text']

            ai_message = SessionService.send_message(
                interview_id=interview_id,
                role='assistant',
                content=ai_response_text,
                metadata={'generated_by': 'groq'}
            )

        except Exception as ai_err:
            ai_error = str(ai_err)

        return success_response({
            'userMessage': user_message,
            'aiMessage': ai_message,
            'aiError': ai_error
        }, 'Message sent successfully', 201)

    except APIError as e:
        return error_response(e.message, e.status_code)
    except Exception as e:
        return error_response(f'Failed to send message: {str(e)}', 500)


@session_bp.route('/<interview_id>/messages', methods=['GET'])
@require_auth
def get_messages(interview_id):
    """Get chat message history for an interview."""
    try:
        limit = int(request.args.get('limit', 50))
        offset = int(request.args.get('offset', 0))

        messages = SessionService.get_messages(
            interview_id=interview_id,
            limit=limit,
            offset=offset
        )

        return success_response({
            'messages': messages,
            'count': len(messages)
        }, 'Messages retrieved successfully')

    except APIError as e:
        return error_response(e.message, e.status_code)
    except Exception as e:
        return error_response(f'Failed to get messages: {str(e)}', 500)


@session_bp.route('/<interview_id>/transcribe', methods=['POST'])
@require_auth
def transcribe_audio(interview_id):
    """Transcribe audio using OpenAI Whisper."""
    try:
        if 'audio' not in request.files:
            raise APIError('No audio file provided', 400)

        audio_file = request.files['audio']
        if audio_file.filename == '':
            raise APIError('No audio file selected', 400)

        question_id = request.form.get('questionId')
        language = request.form.get('language')

        transcription = WhisperService.transcribe_audio(
            interview_id=interview_id,
            audio_file=audio_file,
            question_id=question_id,
            language=language
        )

        return success_response(transcription, 'Audio transcribed successfully', 201)

    except APIError as e:
        return error_response(e.message, e.status_code)
    except Exception as e:
        return error_response(f'Failed to transcribe audio: {str(e)}', 500)


@session_bp.route('/<interview_id>/transcriptions', methods=['GET'])
@require_auth
def get_transcriptions(interview_id):
    """Get transcriptions for an interview."""
    try:
        question_id = request.args.get('questionId')

        transcriptions = WhisperService.get_transcriptions(
            interview_id=interview_id,
            question_id=question_id
        )

        return success_response({
            'transcriptions': transcriptions,
            'count': len(transcriptions)
        }, 'Transcriptions retrieved successfully')

    except APIError as e:
        return error_response(e.message, e.status_code)
    except Exception as e:
        return error_response(f'Failed to get transcriptions: {str(e)}', 500)
