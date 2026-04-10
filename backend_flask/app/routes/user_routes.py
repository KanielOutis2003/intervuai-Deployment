"""User profile and preferences routes."""

from flask import Blueprint, request, g
from app.services.user_service import UserService
from app.utils.validation import validate_request, UpdateProfileSchema, UpdatePreferencesSchema
from app.utils.responses import success_response, error_response, APIError
from app.middleware.auth import require_auth

user_bp = Blueprint('user', __name__, url_prefix='/api/users')


@user_bp.route('/me', methods=['GET'])
@require_auth
def get_profile():
    """
    Get current user's profile.

    Headers:
        - Authorization: Bearer <access_token>

    Returns:
        200: User profile data
        401: Unauthorized
        404: Profile not found
    """
    try:
        profile = UserService.get_profile(g.user['id'])
        return success_response(profile, 'Profile retrieved successfully')
    except APIError as e:
        return error_response(e.message, e.status_code)
    except Exception as e:
        return error_response(f'Failed to fetch profile: {str(e)}', 500)


@user_bp.route('/me', methods=['PATCH'])
@require_auth
@validate_request(UpdateProfileSchema)
def update_profile():
    """
    Update current user's profile.

    Headers:
        - Authorization: Bearer <access_token>

    Request body:
        - fullName: User's full name (optional)
        - avatarUrl: User's avatar URL (optional)

    Returns:
        200: Profile updated successfully
        400: Invalid data
        401: Unauthorized
    """
    try:
        data = request.validated_data
        profile = UserService.update_profile(
            user_id=g.user['id'],
            full_name=data.get('fullName'),
            avatar_url=data.get('avatarUrl'),
            target_industry=data.get('targetIndustry'),
            experience_level=data.get('experienceLevel'),
            resume_url=data.get('resumeUrl'),
        )
        return success_response(profile, 'Profile updated successfully')
    except APIError as e:
        return error_response(e.message, e.status_code)
    except Exception as e:
        return error_response(f'Failed to update profile: {str(e)}', 500)


@user_bp.route('/me/preferences', methods=['GET'])
@require_auth
def get_preferences():
    """
    Get current user's preferences.

    Headers:
        - Authorization: Bearer <access_token>

    Returns:
        200: User preferences
        401: Unauthorized
    """
    try:
        preferences = UserService.get_preferences(g.user['id'])
        return success_response(preferences, 'Preferences retrieved successfully')
    except APIError as e:
        return error_response(e.message, e.status_code)
    except Exception as e:
        return error_response(f'Failed to fetch preferences: {str(e)}', 500)


@user_bp.route('/me/preferences', methods=['PATCH'])
@require_auth
@validate_request(UpdatePreferencesSchema)
def update_preferences():
    """
    Update current user's preferences.

    Headers:
        - Authorization: Bearer <access_token>

    Request body:
        - preferences: Dict of preferences to update (merged with existing)

    Returns:
        200: Preferences updated successfully
        400: Invalid data
        401: Unauthorized
    """
    try:
        data = request.validated_data
        preferences = UserService.update_preferences(
            user_id=g.user['id'],
            preferences=data['preferences']
        )
        return success_response(preferences, 'Preferences updated successfully')
    except APIError as e:
        return error_response(e.message, e.status_code)
    except Exception as e:
        return error_response(f'Failed to update preferences: {str(e)}', 500)


@user_bp.route('/me/dashboard', methods=['GET'])
@require_auth
def get_dashboard():
    """
    Get current user's dashboard data.

    Headers:
        - Authorization: Bearer <access_token>

    Returns:
        200: Dashboard summary data (interview stats, recent activity, scores)
        401: Unauthorized
    """
    try:
        dashboard_data = UserService.get_dashboard_data(g.user['id'])
        return success_response(dashboard_data, 'Dashboard data retrieved successfully')
    except APIError as e:
        return error_response(e.message, e.status_code)
    except Exception as e:
        return error_response(f'Failed to fetch dashboard data: {str(e)}', 500)
