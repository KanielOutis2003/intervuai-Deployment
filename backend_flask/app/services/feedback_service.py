"""Feedback service for database operations."""
from typing import List, Dict, Optional
from app.config.supabase_client import supabase_admin
from app.utils.responses import APIError


class FeedbackService:
    """Service for managing feedback."""

    @staticmethod
    def create_feedback(feedback_data: Dict) -> Dict:
        """Create feedback for a question response."""
        data = {
            'interview_id': feedback_data['interviewId'],
            'question_id': feedback_data['questionId'],
            'user_response': feedback_data.get('userResponse', ''),
            'transcription': feedback_data.get('transcription', ''),
            'relevance_score': feedback_data.get('relevanceScore', 0),
            'grammar_score': feedback_data.get('grammarScore', 0),
            'confidence_score': feedback_data.get('confidenceScore', 0),
            'keywords_matched': feedback_data.get('keywordsMatched', []),
            'ai_feedback': feedback_data.get('aiFeedback', '')
        }

        result = supabase_admin.table('feedback').insert(data).execute()

        if not result.data:
            raise APIError('Failed to create feedback', 500)

        return result.data[0]

    @staticmethod
    def get_feedback_by_id(feedback_id: str) -> Dict:
        """Get feedback by ID."""
        result = supabase_admin.table('feedback')\
            .select('*')\
            .eq('id', feedback_id)\
            .execute()

        if not result.data:
            raise APIError('Feedback not found', 404)

        return result.data[0]

    @staticmethod
    def get_interview_feedback(interview_id: str) -> List[Dict]:
        """Get all feedback for an interview."""
        result = supabase_admin.table('feedback')\
            .select('*')\
            .eq('interview_id', interview_id)\
            .order('created_at')\
            .execute()

        return result.data or []

    @staticmethod
    def get_question_feedback(question_id: str) -> Optional[Dict]:
        """Get feedback for a specific question."""
        result = supabase_admin.table('feedback')\
            .select('*')\
            .eq('question_id', question_id)\
            .execute()

        return result.data[0] if result.data else None

    @staticmethod
    def get_average_scores(interview_id: str) -> Dict:
        """Get average scores for an interview."""
        result = supabase_admin.table('feedback')\
            .select('relevance_score, grammar_score, confidence_score')\
            .eq('interview_id', interview_id)\
            .execute()

        feedback = result.data or []

        if not feedback:
            return {
                'averageRelevance': 0,
                'averageGrammar': 0,
                'averageConfidence': 0
            }

        total_rel = sum(f['relevance_score'] or 0 for f in feedback)
        total_gram = sum(f['grammar_score'] or 0 for f in feedback)
        total_conf = sum(f['confidence_score'] or 0 for f in feedback)

        count = len(feedback)

        return {
            'averageRelevance': total_rel / count,
            'averageGrammar': total_gram / count,
            'averageConfidence': total_conf / count
        }

    @staticmethod
    def delete_interview_feedback(interview_id: str):
        """Delete all feedback for an interview."""
        supabase_admin.table('feedback')\
            .delete()\
            .eq('interview_id', interview_id)\
            .execute()


class NonVerbalMetricsService:
    """Service for managing non-verbal metrics."""

    @staticmethod
    def record_metric(metric_data: Dict):
        """Record a non-verbal metric data point."""
        data = {
            'interview_id': metric_data['interviewId'],
            'eye_contact': metric_data['eyeContact'],
            'posture_status': metric_data['postureStatus'],
            'posture_angle': metric_data['postureAngle']
        }

        supabase_admin.table('non_verbal_metrics').insert(data).execute()

    @staticmethod
    def get_interview_metrics(interview_id: str) -> List[Dict]:
        """Get all non-verbal metrics for an interview."""
        result = supabase_admin.table('non_verbal_metrics')\
            .select('*')\
            .eq('interview_id', interview_id)\
            .order('timestamp')\
            .execute()

        return result.data or []

    @staticmethod
    def calculate_non_verbal_scores(interview_id: str) -> Dict:
        """Calculate aggregated non-verbal scores."""
        metrics = NonVerbalMetricsService.get_interview_metrics(interview_id)

        if not metrics:
            return {
                'eyeContactPercentage': 0,
                'averagePostureScore': 0
            }

        eye_contact_count = sum(1 for m in metrics if m['eye_contact'])
        eye_contact_percentage = (eye_contact_count / len(metrics)) * 100

        posture_scores = []
        for m in metrics:
            angle = abs(m['posture_angle'])
            if angle <= 10:
                posture_scores.append(100)
            elif angle <= 20:
                posture_scores.append(80)
            elif angle <= 30:
                posture_scores.append(60)
            else:
                posture_scores.append(40)

        average_posture_score = sum(posture_scores) / len(posture_scores)

        return {
            'eyeContactPercentage': eye_contact_percentage,
            'averagePostureScore': average_posture_score
        }
