"""Interview service for database operations."""
import logging
from datetime import datetime
from typing import List, Dict, Optional
from app.config.supabase_client import supabase_admin
from app.utils.responses import APIError

logger = logging.getLogger(__name__)


class InterviewService:
    """Service for managing interviews."""

    @staticmethod
    def create_interview(user_id: str, job_role: str, interview_type: str = 'general') -> Dict:
        """Create a new interview session."""
        interview_data = {
            'user_id': user_id,
            'job_role': job_role,
            'interview_type': interview_type,
            'status': 'pending',
            'started_at': datetime.utcnow().isoformat(),
            'completed_at': None,
            'overall_score': None,
            'verbal_score': None,
            'non_verbal_score': None,
            'eye_contact_score': None,
            'posture_score': None
        }

        result = supabase_admin.table('interviews').insert(interview_data).execute()

        if not result.data:
            raise APIError('Failed to create interview', 500)

        return result.data[0]

    @staticmethod
    def get_interview_by_id(interview_id: str, user_id: str) -> Dict:
        """Get interview by ID."""
        result = supabase_admin.table('interviews')\
            .select('*')\
            .eq('id', interview_id)\
            .eq('user_id', user_id)\
            .execute()

        if not result.data:
            raise APIError('Interview not found', 404)

        return result.data[0]

    @staticmethod
    def get_user_interviews(user_id: str) -> List[Dict]:
        """Get all interviews for a user."""
        result = supabase_admin.table('interviews')\
            .select('*')\
            .eq('user_id', user_id)\
            .order('created_at', desc=True)\
            .execute()

        return result.data or []

    @staticmethod
    def update_interview_status(interview_id: str, user_id: str, status: str) -> Dict:
        """Update interview status."""
        update_data = {'status': status}

        if status == 'completed':
            update_data['completed_at'] = datetime.utcnow().isoformat()

        result = supabase_admin.table('interviews')\
            .update(update_data)\
            .eq('id', interview_id)\
            .eq('user_id', user_id)\
            .execute()

        if not result.data:
            raise APIError('Failed to update interview', 500)

        return result.data[0]

    @staticmethod
    def update_interview_scores(interview_id: str, scores: Dict) -> Dict:
        """Update interview scores."""
        update_data = {}

        if 'overallScore' in scores:
            update_data['overall_score'] = scores['overallScore']
        if 'verbalScore' in scores:
            update_data['verbal_score'] = scores['verbalScore']
        if 'nonVerbalScore' in scores:
            update_data['non_verbal_score'] = scores['nonVerbalScore']
        if 'eyeContactScore' in scores:
            update_data['eye_contact_score'] = scores['eyeContactScore']
        if 'postureScore' in scores:
            update_data['posture_score'] = scores['postureScore']

        result = supabase_admin.table('interviews')\
            .update(update_data)\
            .eq('id', interview_id)\
            .execute()

        if not result.data:
            raise APIError('Failed to update scores', 500)

        return result.data[0]

    @staticmethod
    def calculate_scores(interview_id: str):
        """Calculate and update interview scores using stored procedure."""
        supabase_admin.rpc('calculate_interview_scores', {
            'interview_uuid': interview_id
        }).execute()

    @staticmethod
    def delete_interview(interview_id: str, user_id: str):
        """Delete an interview."""
        supabase_admin.table('interviews')\
            .delete()\
            .eq('id', interview_id)\
            .eq('user_id', user_id)\
            .execute()

    @staticmethod
    def count_monthly_interviews(user_id: str) -> int:
        """Count interviews created by user in the current calendar month."""
        now = datetime.utcnow()
        month_start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0).isoformat()
        result = supabase_admin.table('interviews') \
            .select('id', count='exact') \
            .eq('user_id', user_id) \
            .gte('created_at', month_start) \
            .execute()
        return result.count or 0

    @staticmethod
    def get_user_statistics(user_id: str) -> Dict:
        """Get user statistics."""
        try:
            result = supabase_admin.table('interviews')\
                .select('status, overall_score, verbal_score, non_verbal_score')\
                .eq('user_id', user_id)\
                .execute()

            interviews = result.data or []
            completed = [i for i in interviews if i['status'] == 'completed']

            def calc_avg(scores):
                valid = [s for s in scores if s is not None]
                return sum(valid) / len(valid) if valid else 0

            from app.services.subscription_service import SubscriptionService
            is_premium = SubscriptionService.is_premium(user_id)
            monthly_count = InterviewService.count_monthly_interviews(user_id)

            return {
                'totalInterviews': len(interviews),
                'completedInterviews': len(completed),
                'averageScore': calc_avg([i['overall_score'] for i in completed]),
                'averageVerbalScore': calc_avg([i['verbal_score'] for i in completed]),
                'averageNonVerbalScore': calc_avg([i['non_verbal_score'] for i in completed]),
                'monthlyInterviewCount': monthly_count,
                'monthlyLimit': None if is_premium else 5,
                'isPremium': is_premium,
            }
        except Exception as e:
            logger.exception('get_user_statistics failed for user %s: %s', user_id, str(e))
            raise
