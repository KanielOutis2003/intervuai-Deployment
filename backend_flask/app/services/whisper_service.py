"""Whisper service for audio transcription using OpenAI Whisper API."""

from typing import Dict, Any, List, Optional
from app.config.config import Config
from app.config.supabase_client import supabase_admin
from app.utils.responses import APIError
import openai


class WhisperService:
    """Service class for audio transcription operations."""

    @staticmethod
    def transcribe_audio(interview_id: str, audio_file, question_id: Optional[str] = None, language: Optional[str] = None) -> Dict[str, Any]:
        """
        Transcribe audio using OpenAI Whisper API.

        Args:
            interview_id: The interview ID
            audio_file: Audio file object (from request.files)
            question_id: Optional question ID
            language: Optional language code (e.g., 'en')

        Returns:
            Dict containing transcription data

        Raises:
            APIError: If transcription fails
        """
        try:
            # Initialize OpenAI client
            client = openai.OpenAI(api_key=Config.OPENAI_API_KEY)

            # Prepare transcription request
            transcribe_params = {
                "model": "whisper-1",
                "file": audio_file,
                "response_format": "verbose_json"
            }

            if language:
                transcribe_params["language"] = language

            # Call OpenAI Whisper API
            response = client.audio.transcriptions.create(**transcribe_params)

            # Extract transcription data
            transcription_text = response.text
            duration = getattr(response, 'duration', None)
            detected_language = getattr(response, 'language', language or 'en')

            # Save transcription to database
            transcription_insert = {
                'interview_id': interview_id,
                'question_id': question_id,
                'transcription': transcription_text,
                'language': detected_language,
                'duration': duration,
                'metadata': {
                    'model': 'whisper-1',
                    'response_format': 'verbose_json'
                }
            }

            db_response = supabase_admin.table('voice_transcriptions').insert(transcription_insert).execute()

            if not db_response.data:
                raise APIError("Failed to save transcription", 500)

            saved_transcription = db_response.data[0]

            return {
                "id": saved_transcription['id'],
                "interviewId": saved_transcription['interview_id'],
                "questionId": saved_transcription.get('question_id'),
                "transcription": saved_transcription['transcription'],
                "language": saved_transcription.get('language'),
                "duration": saved_transcription.get('duration'),
                "confidence": saved_transcription.get('confidence'),
                "metadata": saved_transcription.get('metadata', {}),
                "createdAt": saved_transcription['created_at']
            }

        except openai.OpenAIError as e:
            raise APIError(f"OpenAI Whisper API error: {str(e)}", 500)
        except APIError:
            raise
        except Exception as e:
            raise APIError(f"Failed to transcribe audio: {str(e)}", 500)

    @staticmethod
    def get_transcriptions(interview_id: str, question_id: Optional[str] = None) -> List[Dict[str, Any]]:
        """
        Get transcriptions for an interview or specific question.

        Args:
            interview_id: The interview ID
            question_id: Optional question ID to filter by

        Returns:
            List of transcription dicts

        Raises:
            APIError: If fetch fails
        """
        try:
            query = supabase_admin.table('voice_transcriptions').select('*').eq('interview_id', interview_id)

            if question_id:
                query = query.eq('question_id', question_id)

            response = query.order('created_at', desc=True).execute()

            transcriptions = []
            for trans in response.data:
                transcriptions.append({
                    "id": trans['id'],
                    "interviewId": trans['interview_id'],
                    "questionId": trans.get('question_id'),
                    "transcription": trans['transcription'],
                    "language": trans.get('language'),
                    "duration": trans.get('duration'),
                    "confidence": trans.get('confidence'),
                    "audioUrl": trans.get('audio_url'),
                    "metadata": trans.get('metadata', {}),
                    "createdAt": trans['created_at']
                })

            return transcriptions

        except Exception as e:
            raise APIError(f"Failed to fetch transcriptions: {str(e)}", 500)

    @staticmethod
    def get_transcription_by_id(transcription_id: str) -> Dict[str, Any]:
        """
        Get a specific transcription by ID.

        Args:
            transcription_id: The transcription ID

        Returns:
            Dict containing transcription data

        Raises:
            APIError: If transcription not found
        """
        try:
            response = supabase_admin.table('voice_transcriptions').select('*').eq('id', transcription_id).execute()

            if not response.data:
                raise APIError("Transcription not found", 404)

            trans = response.data[0]
            return {
                "id": trans['id'],
                "interviewId": trans['interview_id'],
                "questionId": trans.get('question_id'),
                "transcription": trans['transcription'],
                "language": trans.get('language'),
                "duration": trans.get('duration'),
                "confidence": trans.get('confidence'),
                "audioUrl": trans.get('audio_url'),
                "metadata": trans.get('metadata', {}),
                "createdAt": trans['created_at']
            }

        except APIError:
            raise
        except Exception as e:
            raise APIError(f"Failed to fetch transcription: {str(e)}", 500)
