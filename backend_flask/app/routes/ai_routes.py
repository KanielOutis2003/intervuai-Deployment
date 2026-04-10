"""AI interview routes — powered by Groq."""
import re
import json
import logging
from flask import Blueprint, request, g, Response, stream_with_context
from app.middleware.auth import require_auth
from app.services.groq_service import GroqService
from app.utils.responses import success_response, error_response

logger = logging.getLogger(__name__)

ai_bp = Blueprint('ai', __name__, url_prefix='/api/ai')

# Maps interview type → question_bank category for seed question lookup
_TYPE_TO_CATEGORY = {
    'technical':   'technical',
    'behavioral':  'behavioral',
    'situational': 'situational',
}


def _inject_seed_questions(session_id: str, user_message: str) -> None:
    """
    When a START_INTERVIEW trigger arrives, parse the job role and interview type,
    fetch matching seed questions from the question bank, build an enhanced
    system prompt, and store it for the session.
    """
    try:
        role_match = re.search(r'Role:\s*([^.]+)', user_message)
        type_match = re.search(r'Type:\s*([^.]+)', user_message)
        job_role      = role_match.group(1).strip() if role_match else 'General'
        interview_type = type_match.group(1).strip().lower() if type_match else 'general'

        # Fetch seed questions from question_bank
        from app.config.supabase_client import supabase_admin
        category = _TYPE_TO_CATEGORY.get(interview_type)

        query = (
            supabase_admin.table('question_bank')
            .select('question_text')
            .eq('is_active', True)
        )
        # Filter by job role (partial match) if role is provided
        if job_role and job_role.lower() != 'general':
            query = query.ilike('job_role', f'%{job_role}%')
        # Filter by category when interview type maps to one
        if category:
            query = query.eq('category', category)

        seed_resp = query.limit(8).execute()
        seed_questions = [r['question_text'] for r in (seed_resp.data or [])]

        # Build and store enhanced system prompt for this session
        prompt = GroqService.build_prompt(interview_type, seed_questions)
        GroqService.set_session_prompt(session_id, prompt)

        logger.info(
            'Session %s: role=%s type=%s seed_questions=%d',
            session_id, job_role, interview_type, len(seed_questions),
        )
    except Exception as exc:
        # Non-fatal — interview will still work with default prompt
        logger.warning('Failed to inject seed questions for session %s: %s', session_id, str(exc))


@ai_bp.route('/predict', methods=['POST'])
@ai_bp.route('/predict/<path:chatflow_id>', methods=['POST'])
@require_auth
def predict(chatflow_id=None):
    """
    AI interview prediction endpoint.

    Accepts:
        {
          "question": "user message or START_INTERVIEW trigger",
          "overrideConfig": { "sessionId": "uuid" }
        }

    Returns:
        { "text": "<JSON string with next_question, evaluation, interview_phase, is_complete>" }
    """
    data = request.get_json(silent=True) or {}

    user_message = data.get('question', '').strip()
    session_id = data.get('overrideConfig', {}).get('sessionId') or g.user['id']

    if not user_message:
        return error_response('Missing required field: question', 400)

    # On START_INTERVIEW: build per-session prompt with type guidance + seed questions
    if user_message.startswith('START_INTERVIEW'):
        _inject_seed_questions(session_id, user_message)

    try:
        result = GroqService.chat(session_id=session_id, user_message=user_message)
        return success_response({'text': result['text']})

    except Exception as exc:
        err_msg = str(exc)
        logger.error('AI predict error for session %s: %s', session_id, err_msg)

        if 'api_key' in err_msg.lower() or 'api key' in err_msg.lower():
            return error_response('AI service is not configured. Please add GROQ_API_KEY to the backend .env.', 503)
        if 'quota' in err_msg.lower() or '429' in err_msg:
            return error_response('AI rate limit reached. Please wait a moment and try again.', 429)
        if 'overloaded' in err_msg.lower() or '503' in err_msg:
            return error_response('AI service is temporarily unavailable. Please try again shortly.', 503)

        return error_response(f'AI service error: {err_msg}', 500)


@ai_bp.route('/predict/stream', methods=['POST'])
@require_auth
def predict_stream():
    """
    Streaming AI interview endpoint using Server-Sent Events (SSE).

    Identical payload to /predict but streams Groq tokens as they arrive,
    giving users near-instant first-word latency (~300 ms).

    SSE events:
      data: {"status": "started"}
      data: {"chunk": "<token>"}          — one or more, accumulate client-side
      data: {"done": true, "full_text": "<complete JSON response>"}
      data: {"error": "<message>"}        — on failure

    The client should parse full_text as JSON when done=true to extract
    next_question, evaluation, interview_phase, is_complete, etc.
    """
    data = request.get_json(silent=True) or {}
    user_message = data.get('question', '').strip()
    session_id = data.get('overrideConfig', {}).get('sessionId') or g.user['id']

    if not user_message:
        return error_response('Missing required field: question', 400)

    if user_message.startswith('START_INTERVIEW'):
        _inject_seed_questions(session_id, user_message)

    def generate():
        yield f'data: {json.dumps({"status": "started"})}\n\n'
        yield from GroqService.stream_chat(session_id, user_message)

    return Response(
        stream_with_context(generate()),
        mimetype='text/event-stream',
        headers={
            'Cache-Control': 'no-cache',
            'X-Accel-Buffering': 'no',
            'Connection': 'keep-alive',
        }
    )


@ai_bp.route('/session/<session_id>', methods=['DELETE'])
@require_auth
def clear_session(session_id):
    """Clear conversation history for a session (call when interview ends)."""
    GroqService.clear_session(session_id)
    return success_response({'cleared': session_id}, 'Session cleared')
