"""Session management service for interview sessions and chat messages."""

from typing import Dict, Any, List, Optional
from datetime import datetime
from app.config.supabase_client import supabase_admin
from app.utils.responses import APIError
from app.utils.encryption import encrypt_text, decrypt_text


class SessionService:
    """Service class for interview session operations."""

    @staticmethod
    def start_session(interview_id: str, session_data: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        """
        Start a new interview session.

        Args:
            interview_id: The interview ID
            session_data: Optional session configuration data

        Returns:
            Dict containing session information

        Raises:
            APIError: If session creation fails
        """
        try:
            # Check if interview exists
            interview_response = supabase_admin.table('interviews').select('id, status').eq('id', interview_id).execute()

            if not interview_response.data:
                raise APIError("Interview not found", 404)

            # Check if there's already an active session — return it (idempotent)
            active_session_response = supabase_admin.table('interview_sessions').select('*').eq('interview_id', interview_id).is_('ended_at', 'null').execute()

            if active_session_response.data:
                existing = active_session_response.data[0]
                return {
                    "id": existing['id'],
                    "interviewId": existing['interview_id'],
                    "startedAt": existing['started_at'],
                    "endedAt": existing.get('ended_at'),
                    "sessionData": existing.get('session_data', {}),
                    "createdAt": existing['created_at']
                }

            # Create new session
            session_insert = {
                'interview_id': interview_id,
                'session_data': session_data or {},
                'started_at': datetime.utcnow().isoformat()
            }

            response = supabase_admin.table('interview_sessions').insert(session_insert).execute()

            if not response.data:
                raise APIError("Failed to create session", 500)

            # Update interview status to in_progress
            supabase_admin.table('interviews').update({'status': 'in_progress'}).eq('id', interview_id).execute()

            session = response.data[0]
            return {
                "id": session['id'],
                "interviewId": session['interview_id'],
                "startedAt": session['started_at'],
                "endedAt": session.get('ended_at'),
                "sessionData": session.get('session_data', {}),
                "createdAt": session['created_at']
            }
        except APIError:
            raise
        except Exception as e:
            raise APIError(f"Failed to start session: {str(e)}", 500)

    @staticmethod
    def end_session(session_id: str) -> Dict[str, Any]:
        """
        End an interview session.

        Args:
            session_id: The session ID

        Returns:
            Dict containing updated session information

        Raises:
            APIError: If session update fails
        """
        try:
            # Update session end time
            response = supabase_admin.table('interview_sessions').update({
                'ended_at': datetime.utcnow().isoformat()
            }).eq('id', session_id).execute()

            if not response.data:
                raise APIError("Session not found", 404)

            session = response.data[0]

            # Update interview status to completed
            supabase_admin.table('interviews').update({
                'status': 'completed'
            }).eq('id', session['interview_id']).execute()

            return {
                "id": session['id'],
                "interviewId": session['interview_id'],
                "startedAt": session['started_at'],
                "endedAt": session['ended_at'],
                "sessionData": session.get('session_data', {}),
                "createdAt": session['created_at']
            }
        except APIError:
            raise
        except Exception as e:
            raise APIError(f"Failed to end session: {str(e)}", 500)

    @staticmethod
    def get_session(session_id: str) -> Dict[str, Any]:
        """
        Get session details by ID.

        Args:
            session_id: The session ID

        Returns:
            Dict containing session information

        Raises:
            APIError: If session not found
        """
        try:
            response = supabase_admin.table('interview_sessions').select('*').eq('id', session_id).execute()

            if not response.data:
                raise APIError("Session not found", 404)

            session = response.data[0]
            return {
                "id": session['id'],
                "interviewId": session['interview_id'],
                "startedAt": session['started_at'],
                "endedAt": session.get('ended_at'),
                "sessionData": session.get('session_data', {}),
                "createdAt": session['created_at'],
                "updatedAt": session['updated_at']
            }
        except APIError:
            raise
        except Exception as e:
            raise APIError(f"Failed to fetch session: {str(e)}", 500)

    @staticmethod
    def send_message(interview_id: str, role: str, content: str, metadata: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        """
        Send/save a chat message in the interview session.

        Args:
            interview_id: The interview ID
            role: Message role ('user', 'assistant', 'system')
            content: Message content
            metadata: Optional message metadata

        Returns:
            Dict containing message information

        Raises:
            APIError: If message creation fails
        """
        try:
            # Validate role
            if role not in ['user', 'assistant', 'system']:
                raise APIError("Invalid role. Must be 'user', 'assistant', or 'system'", 400)

            # Create message (encrypt content at rest if enabled)
            message_insert = {
                'interview_id': interview_id,
                'role': role,
                'content': encrypt_text(content),
                'metadata': metadata or {},
                'timestamp': datetime.utcnow().isoformat()
            }

            response = supabase_admin.table('chat_messages').insert(message_insert).execute()

            if not response.data:
                raise APIError("Failed to create message", 500)

            message = response.data[0]
            return {
                "id": message['id'],
                "interviewId": message['interview_id'],
                "role": message['role'],
                "content": decrypt_text(message['content']),
                "metadata": message.get('metadata', {}),
                "timestamp": message['timestamp'],
                "createdAt": message['created_at']
            }
        except APIError:
            raise
        except Exception as e:
            raise APIError(f"Failed to send message: {str(e)}", 500)

    @staticmethod
    def get_messages(interview_id: str, limit: int = 50, offset: int = 0) -> List[Dict[str, Any]]:
        """
        Get chat messages for an interview.

        Args:
            interview_id: The interview ID
            limit: Maximum number of messages to return
            offset: Number of messages to skip

        Returns:
            List of message dicts

        Raises:
            APIError: If message fetch fails
        """
        try:
            response = supabase_admin.table('chat_messages').select('*').eq('interview_id', interview_id).order('timestamp', desc=False).range(offset, offset + limit - 1).execute()

            messages = []
            for msg in response.data:
                messages.append({
                    "id": msg['id'],
                    "interviewId": msg['interview_id'],
                    "role": msg['role'],
                    "content": decrypt_text(msg['content']),
                    "metadata": msg.get('metadata', {}),
                    "timestamp": msg['timestamp'],
                    "createdAt": msg['created_at']
                })

            return messages
        except Exception as e:
            raise APIError(f"Failed to fetch messages: {str(e)}", 500)

    @staticmethod
    def get_active_session_by_interview(interview_id: str) -> Optional[Dict[str, Any]]:
        """
        Get active session for an interview.

        Args:
            interview_id: The interview ID

        Returns:
            Dict containing session information or None if no active session

        Raises:
            APIError: If query fails
        """
        try:
            response = supabase_admin.table('interview_sessions').select('*').eq('interview_id', interview_id).is_('ended_at', 'null').execute()

            if not response.data:
                return None

            session = response.data[0]
            return {
                "id": session['id'],
                "interviewId": session['interview_id'],
                "startedAt": session['started_at'],
                "endedAt": session.get('ended_at'),
                "sessionData": session.get('session_data', {}),
                "createdAt": session['created_at'],
                "updatedAt": session['updated_at']
            }
        except Exception as e:
            raise APIError(f"Failed to fetch active session: {str(e)}", 500)
