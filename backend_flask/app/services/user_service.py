"""User profile and preferences service."""
import logging

from typing import Dict, Any, Optional
from app.config.supabase_client import supabase_admin
from app.utils.responses import APIError

logger = logging.getLogger(__name__)


class UserService:
    """Service class for user profile and preference operations."""

    @staticmethod
    def get_profile(user_id: str) -> Dict[str, Any]:
        """
        Get user profile by user ID.

        Args:
            user_id: The user's ID

        Returns:
            Dict containing user profile data

        Raises:
            APIError: If profile not found
        """
        try:
            response = supabase_admin.table('user_profiles').select('*').eq('user_id', user_id).execute()

            if not response.data:
                raise APIError("Profile not found", 404)

            profile = response.data[0]
            return {
                "id": profile['id'],
                "userId": profile['user_id'],
                "fullName": profile.get('full_name'),
                "avatarUrl": profile.get('avatar_url'),
                "role": profile.get('role', 'user'),
                "isPremium": profile.get('is_premium', False),
                "targetIndustry": profile.get('target_industry'),
                "experienceLevel": profile.get('experience_level'),
                "resumeUrl": profile.get('resume_url'),
                "preferences": profile.get('preferences', {}),
                "createdAt": profile['created_at'],
                "updatedAt": profile['updated_at']
            }
        except APIError:
            raise
        except Exception as e:
            raise APIError(f"Failed to fetch profile: {str(e)}", 500)

    @staticmethod
    def update_profile(
        user_id: str,
        full_name: Optional[str] = None,
        avatar_url: Optional[str] = None,
        target_industry: Optional[str] = None,
        experience_level: Optional[str] = None,
        resume_url: Optional[str] = None,
    ) -> Dict[str, Any]:
        """
        Update user profile.

        Args:
            user_id: The user's ID
            full_name: Updated full name (optional)
            avatar_url: Updated avatar URL (optional)

        Returns:
            Dict containing updated user profile

        Raises:
            APIError: If update fails
        """
        try:
            # Build update data
            update_data = {}
            if full_name is not None:
                update_data['full_name'] = full_name
            if avatar_url is not None:
                update_data['avatar_url'] = avatar_url
            if target_industry is not None:
                update_data['target_industry'] = target_industry
            if experience_level is not None:
                update_data['experience_level'] = experience_level
            if resume_url is not None:
                update_data['resume_url'] = resume_url

            if not update_data:
                raise APIError("No update data provided", 400)

            # Update profile
            response = supabase_admin.table('user_profiles').update(update_data).eq('user_id', user_id).execute()

            if not response.data:
                raise APIError("Profile not found", 404)

            profile = response.data[0]
            return {
                "id": profile['id'],
                "userId": profile['user_id'],
                "fullName": profile.get('full_name'),
                "avatarUrl": profile.get('avatar_url'),
                "role": profile.get('role', 'user'),
                "isPremium": profile.get('is_premium', False),
                "targetIndustry": profile.get('target_industry'),
                "experienceLevel": profile.get('experience_level'),
                "resumeUrl": profile.get('resume_url'),
                "preferences": profile.get('preferences', {}),
                "createdAt": profile['created_at'],
                "updatedAt": profile['updated_at']
            }
        except APIError:
            raise
        except Exception as e:
            raise APIError(f"Failed to update profile: {str(e)}", 500)

    @staticmethod
    def get_preferences(user_id: str) -> Dict[str, Any]:
        """
        Get user preferences.

        Args:
            user_id: The user's ID

        Returns:
            Dict containing user preferences

        Raises:
            APIError: If preferences not found
        """
        try:
            response = supabase_admin.table('user_profiles').select('preferences').eq('user_id', user_id).execute()

            if not response.data:
                raise APIError("User not found", 404)

            return response.data[0].get('preferences', {})
        except APIError:
            raise
        except Exception as e:
            raise APIError(f"Failed to fetch preferences: {str(e)}", 500)

    @staticmethod
    def update_preferences(user_id: str, preferences: Dict[str, Any]) -> Dict[str, Any]:
        """
        Update user preferences (merge with existing).

        Args:
            user_id: The user's ID
            preferences: New preferences to merge

        Returns:
            Dict containing updated preferences

        Raises:
            APIError: If update fails
        """
        try:
            # Get current preferences
            current_response = supabase_admin.table('user_profiles').select('preferences').eq('user_id', user_id).execute()

            if not current_response.data:
                raise APIError("User not found", 404)

            # Merge preferences
            current_prefs = current_response.data[0].get('preferences', {})
            updated_prefs = {**current_prefs, **preferences}

            # Update preferences
            response = supabase_admin.table('user_profiles').update({
                'preferences': updated_prefs
            }).eq('user_id', user_id).execute()

            return response.data[0].get('preferences', {})
        except APIError:
            raise
        except Exception as e:
            raise APIError(f"Failed to update preferences: {str(e)}", 500)

    @staticmethod
    def get_dashboard_data(user_id: str) -> Dict[str, Any]:
        """
        Get dashboard summary data for a user.

        Args:
            user_id: The user's ID

        Returns:
            Dict containing dashboard data (interview stats, recent activity, etc.)

        Raises:
            APIError: If data fetch fails
        """
        try:
            # Get total interviews count
            interviews_response = supabase_admin.table('interviews').select('id', count='exact').eq('user_id', user_id).execute()
            total_interviews = interviews_response.count or 0

            # Get completed interviews
            completed_response = supabase_admin.table('interviews').select('id', count='exact').eq('user_id', user_id).eq('status', 'completed').execute()
            completed_interviews = completed_response.count or 0

            # Get in-progress interviews
            in_progress_response = supabase_admin.table('interviews').select('id', count='exact').eq('user_id', user_id).eq('status', 'in_progress').execute()
            in_progress_interviews = in_progress_response.count or 0

            # Get recent interviews (last 5)
            recent_response = supabase_admin.table('interviews').select('*').eq('user_id', user_id).order('created_at', desc=True).limit(5).execute()
            recent_interviews = []
            for interview in recent_response.data:
                recent_interviews.append({
                    "id": interview['id'],
                    "jobRole": interview.get('job_role'),
                    "status": interview.get('status'),
                    "overallScore": interview.get('overall_score'),
                    "createdAt": interview['created_at']
                })

            # Get average scores from completed interviews
            avg_scores_response = supabase_admin.table('interviews').select('overall_score, verbal_score, non_verbal_score').eq('user_id', user_id).eq('status', 'completed').execute()

            avg_overall = 0
            avg_verbal = 0
            avg_non_verbal = 0
            if avg_scores_response.data:
                scores = avg_scores_response.data
                overall_scores = [s.get('overall_score', 0) for s in scores if s.get('overall_score')]
                verbal_scores = [s.get('verbal_score', 0) for s in scores if s.get('verbal_score')]
                non_verbal_scores = [s.get('non_verbal_score', 0) for s in scores if s.get('non_verbal_score')]

                avg_overall = round(sum(overall_scores) / len(overall_scores), 2) if overall_scores else 0
                avg_verbal = round(sum(verbal_scores) / len(verbal_scores), 2) if verbal_scores else 0
                avg_non_verbal = round(sum(non_verbal_scores) / len(non_verbal_scores), 2) if non_verbal_scores else 0
                best_score = round(max(overall_scores), 2) if overall_scores else 0
            else:
                best_score = 0

            return {
                "totalInterviews": total_interviews,
                "completedInterviews": completed_interviews,
                "inProgressInterviews": in_progress_interviews,
                # Flat keys for easy frontend access
                "avgScore": avg_overall,
                "bestScore": best_score,
                "avgVerbal": avg_verbal,
                "avgNonVerbal": avg_non_verbal,
                # Nested for backward compatibility
                "averageScores": {
                    "overall": avg_overall,
                    "verbal": avg_verbal,
                    "nonVerbal": avg_non_verbal
                },
                "recentInterviews": recent_interviews
            }
        except Exception as e:
            logger.exception('get_dashboard_data failed: %s', str(e))
            raise APIError(f"Failed to fetch dashboard data: {str(e)}", 500)
