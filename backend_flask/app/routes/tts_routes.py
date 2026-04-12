"""Text-to-Speech routes using OpenAI TTS API."""
import logging
from flask import Blueprint, request, jsonify, Response, g
from app.config.config import Config
from app.middleware.auth import require_auth

logger = logging.getLogger(__name__)

tts_bp = Blueprint('tts', __name__, url_prefix='/api/tts')


@tts_bp.route('/synthesize', methods=['POST'])
@require_auth
def synthesize():
    """Convert text to speech using OpenAI TTS API.

    Accepts: { text: str, voice?: str, speed?: float }
    Returns: audio/mpeg stream
    """
    data = request.get_json(silent=True) or {}
    text = data.get('text', '').strip()

    if not text:
        return jsonify({'success': False, 'error': 'Text is required'}), 400

    if len(text) > 4096:
        return jsonify({'success': False, 'error': 'Text too long (max 4096 chars)'}), 400

    voice = data.get('voice', Config.TTS_VOICE)
    speed = data.get('speed', 1.0)

    # Clamp speed to valid range
    try:
        speed = max(0.25, min(4.0, float(speed)))
    except (ValueError, TypeError):
        speed = 1.0

    # Validate voice option
    valid_voices = ['alloy', 'echo', 'fable', 'onyx', 'nova', 'shimmer']
    if voice not in valid_voices:
        voice = Config.TTS_VOICE

    user_id = g.user['id']

    try:
        from app.services.openai_service import get_openai_client
        client = get_openai_client()

        response = client.audio.speech.create(
            model=Config.TTS_MODEL,
            voice=voice,
            input=text,
            speed=speed,
            response_format='mp3',
        )

        logger.info('TTS synthesized %d chars for user %s (voice=%s)', len(text), user_id, voice)

        def generate():
            for chunk in response.iter_bytes(chunk_size=4096):
                yield chunk

        return Response(
            generate(),
            mimetype='audio/mpeg',
            headers={
                'Content-Type': 'audio/mpeg',
                'Cache-Control': 'no-cache',
            }
        )

    except Exception as exc:
        logger.error('TTS error for user %s: %s', user_id, str(exc))
        return jsonify({'success': False, 'error': 'Text-to-speech failed'}), 500


@tts_bp.route('/voices', methods=['GET'])
@require_auth
def list_voices():
    """Return available TTS voices."""
    voices = [
        {'id': 'onyx', 'name': 'Onyx', 'description': 'Deep, professional male voice'},
        {'id': 'nova', 'name': 'Nova', 'description': 'Warm, friendly female voice'},
        {'id': 'alloy', 'name': 'Alloy', 'description': 'Neutral, balanced voice'},
        {'id': 'echo', 'name': 'Echo', 'description': 'Clear, articulate male voice'},
        {'id': 'fable', 'name': 'Fable', 'description': 'Expressive, storytelling voice'},
        {'id': 'shimmer', 'name': 'Shimmer', 'description': 'Bright, energetic female voice'},
    ]
    return jsonify({'success': True, 'voices': voices}), 200
