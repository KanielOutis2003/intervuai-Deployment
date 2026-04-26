"""User profile and preferences routes."""

import uuid
from flask import Blueprint, request, g
from app.services.user_service import UserService
from app.config.supabase_client import supabase_admin
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


@user_bp.route('/me/resume', methods=['POST'])
@require_auth
def upload_resume():
    """
    Upload a resume file (PDF or DOCX) to Supabase Storage and save the URL.

    Headers:
        - Authorization: Bearer <access_token>

    Request: multipart/form-data with field 'resume'

    Returns:
        200: { resumeUrl }
        400: Missing or invalid file
        500: Upload error
    """
    if 'resume' not in request.files:
        return error_response('No file provided', 400)

    file = request.files['resume']
    if not file.filename:
        return error_response('No file selected', 400)

    allowed_types = {
        'application/pdf': 'pdf',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'docx',
        'application/msword': 'doc',
    }
    content_type = file.content_type or ''
    ext = allowed_types.get(content_type)
    if not ext:
        # Fallback: check filename extension
        fname = file.filename.lower()
        if fname.endswith('.pdf'):
            ext = 'pdf'
            content_type = 'application/pdf'
        elif fname.endswith('.docx'):
            ext = 'docx'
            content_type = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
        elif fname.endswith('.doc'):
            ext = 'doc'
            content_type = 'application/msword'
        else:
            return error_response('Only PDF or Word documents are allowed', 400)

    try:
        user_id = g.user['id']
        file_bytes = file.read()

        # Max 5 MB
        if len(file_bytes) > 5 * 1024 * 1024:
            return error_response('File size must be under 5 MB', 400)

        # Ensure the bucket exists (create it if not)
        try:
            supabase_admin.storage.create_bucket('resumes', options={'public': True})
        except Exception:
            pass  # Already exists — ignore

        storage_path = f"{user_id}/resume_{uuid.uuid4().hex[:8]}.{ext}"

        supabase_admin.storage.from_('resumes').upload(
            storage_path,
            file_bytes,
            {'content-type': content_type, 'upsert': 'true'},
        )

        public_url = supabase_admin.storage.from_('resumes').get_public_url(storage_path)

        # Save URL to profile
        UserService.update_profile(user_id=user_id, resume_url=public_url)

        return success_response({'resumeUrl': public_url}, 'Resume uploaded successfully')
    except APIError as e:
        return error_response(e.message, e.status_code)
    except Exception as e:
        return error_response(f'Upload failed: {str(e)}', 500)


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
