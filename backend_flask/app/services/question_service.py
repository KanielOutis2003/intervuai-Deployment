"""Question service for database operations."""
from typing import List, Dict, Optional
from app.config.supabase_client import supabase_admin
from app.utils.responses import APIError


class QuestionService:
    """Service for managing questions."""

    @staticmethod
    def create_question(question_data: Dict) -> Dict:
        """Create a new question."""
        data = {
            'interview_id': str(question_data['interviewId']),
            'question_text': question_data['questionText'],
            'question_order': question_data['questionOrder'],
            'category': question_data.get('category', 'General'),
            'difficulty': question_data.get('difficulty', 'medium'),
            'expected_keywords': question_data.get('expectedKeywords', [])
        }

        result = supabase_admin.table('questions').insert(data).execute()

        if not result.data:
            raise APIError('Failed to create question', 500)

        return result.data[0]

    @staticmethod
    def create_multiple_questions(interview_id: str, questions: List[Dict]) -> List[Dict]:
        """Create multiple questions."""
        question_inserts = []

        for q in questions:
            question_inserts.append({
                'interview_id': interview_id,
                'question_text': q['questionText'],
                'question_order': q['questionOrder'],
                'category': q.get('category', 'General'),
                'difficulty': q.get('difficulty', 'medium'),
                'expected_keywords': q.get('expectedKeywords', [])
            })

        result = supabase_admin.table('questions').insert(question_inserts).execute()

        if not result.data:
            raise APIError('Failed to create questions', 500)

        return result.data

    @staticmethod
    def get_interview_questions(interview_id: str) -> List[Dict]:
        """Get all questions for an interview."""
        result = supabase_admin.table('questions')\
            .select('*')\
            .eq('interview_id', interview_id)\
            .order('question_order')\
            .execute()

        return result.data or []

    @staticmethod
    def get_question_by_id(question_id: str) -> Dict:
        """Get a specific question."""
        result = supabase_admin.table('questions')\
            .select('*')\
            .eq('id', question_id)\
            .execute()

        if not result.data:
            raise APIError('Question not found', 404)

        return result.data[0]

    @staticmethod
    def get_next_question(interview_id: str, current_order: int) -> Optional[Dict]:
        """Get the next question."""
        result = supabase_admin.table('questions')\
            .select('*')\
            .eq('interview_id', interview_id)\
            .gt('question_order', current_order)\
            .order('question_order')\
            .limit(1)\
            .execute()

        return result.data[0] if result.data else None

    @staticmethod
    def get_questions_by_filters(category: Optional[str] = None, difficulty: Optional[str] = None) -> List[Dict]:
        """Get questions by filters."""
        query = supabase_admin.table('questions').select('*')

        if category:
            query = query.eq('category', category)

        if difficulty:
            query = query.eq('difficulty', difficulty)

        result = query.execute()
        return result.data or []

    @staticmethod
    def delete_interview_questions(interview_id: str):
        """Delete all questions for an interview."""
        supabase_admin.table('questions')\
            .delete()\
            .eq('interview_id', interview_id)\
            .execute()

    @staticmethod
    def get_question_count(interview_id: str) -> int:
        """Get total question count."""
        result = supabase_admin.table('questions')\
            .select('id', count='exact')\
            .eq('interview_id', interview_id)\
            .execute()

        return result.count or 0
