"""Authentication routes."""

from flask import Blueprint, request, g
from app.services.auth_service import AuthService
from app.utils.validation import (
    validate_request,
    RegisterSchema,
    LoginSchema,
    RefreshTokenSchema,
    ForgotPasswordSchema,
    ResetPasswordSchema,
    ChangePasswordSchema
)
from app.utils.responses import success_response, error_response, APIError
from app.middleware.auth import require_auth

auth_bp = Blueprint('auth', __name__, url_prefix='/api/auth')


@auth_bp.route('/register', methods=['POST'])
@validate_request(RegisterSchema)
def register():
    """
    Register a new user.

    Request body:
        - email: User's email address
        - password: User's password (min 6 chars)
        - fullName: User's full name (optional)

    Returns:
        201: User registered successfully with session tokens
        400: Registration failed
    """
    try:
        data = request.validated_data
        result = AuthService.register_user(
            email=data['email'],
            password=data['password'],
            full_name=data.get('fullName')
        )
        return success_response(result, 'User registered successfully', 201)
    except APIError as e:
        return error_response(e.message, e.status_code)
    except Exception as e:
        return error_response(f'Registration failed: {str(e)}', 500)


@auth_bp.route('/login', methods=['POST'])
@validate_request(LoginSchema)
def login():
    """
    Sign in a user with email and password.

    Request body:
        - email: User's email address
        - password: User's password

    Returns:
        200: Login successful with user data and session tokens
        401: Invalid credentials
    """
    try:
        data = request.validated_data
        result = AuthService.login_user(
            email=data['email'],
            password=data['password']
        )
        return success_response(result, 'Login successful')
    except APIError as e:
        return error_response(e.message, e.status_code)
    except Exception as e:
        return error_response(f'Login failed: {str(e)}', 500)


@auth_bp.route('/logout', methods=['POST'])
@require_auth
def logout():
    """
    Sign out the current user.

    Headers:
        - Authorization: Bearer <access_token>

    Returns:
        200: Logout successful
        401: Unauthorized
    """
    try:
        # Get token from header
        auth_header = request.headers.get('Authorization')
        token = auth_header.split(' ')[1]

        result = AuthService.logout_user(token)
        return success_response(result, 'Logged out successfully')
    except APIError as e:
        return error_response(e.message, e.status_code)
    except Exception as e:
        return error_response(f'Logout failed: {str(e)}', 500)


@auth_bp.route('/refresh', methods=['POST'])
@validate_request(RefreshTokenSchema)
def refresh():
    """
    Refresh access token using refresh token.

    Request body:
        - refreshToken: User's refresh token

    Returns:
        200: New access token generated
        401: Invalid or expired refresh token
    """
    try:
        data = request.validated_data
        result = AuthService.refresh_token(data['refresh_token'])
        return success_response(result, 'Token refreshed successfully')
    except APIError as e:
        return error_response(e.message, e.status_code)
    except Exception as e:
        return error_response(f'Token refresh failed: {str(e)}', 500)


@auth_bp.route('/forgot-password', methods=['POST'])
@validate_request(ForgotPasswordSchema)
def forgot_password():
    """
    Send password reset email.

    Request body:
        - email: User's email address

    Returns:
        200: Password reset email sent
        400: Failed to send email
    """
    try:
        data = request.validated_data
        result = AuthService.forgot_password(data['email'])
        return success_response(result, 'Password reset email sent')
    except APIError as e:
        return error_response(e.message, e.status_code)
    except Exception as e:
        return error_response(f'Password reset failed: {str(e)}', 500)


@auth_bp.route('/reset-password', methods=['POST'])
@validate_request(ResetPasswordSchema)
def reset_password():
    """
    Reset password using reset token.

    Request body:
        - token: Password reset token from email
        - newPassword: New password (min 6 chars)

    Returns:
        200: Password reset successful
        400: Invalid or expired token
    """
    try:
        data = request.validated_data
        result = AuthService.reset_password(
            access_token=data['token'],
            new_password=data['newPassword']
        )
        return success_response(result, 'Password reset successfully')
    except APIError as e:
        return error_response(e.message, e.status_code)
    except Exception as e:
        return error_response(f'Password reset failed: {str(e)}', 500)


@auth_bp.route('/change-password', methods=['POST'])
@require_auth
@validate_request(ChangePasswordSchema)
def change_password():
    """
    Change current user's password.

    Headers:
        - Authorization: Bearer <access_token>

    Request body:
        - newPassword: New password (min 6 chars)

    Returns:
        200: Password updated successfully
        400: Invalid data
        401: Unauthorized
    """
    try:
        # Get token from header
        auth_header = request.headers.get('Authorization')
        token = auth_header.split(' ')[1]

        data = request.validated_data
        result = AuthService.change_password(
            access_token=token,
            new_password=data['newPassword']
        )
        return success_response(result, 'Password updated successfully')
    except APIError as e:
        return error_response(e.message, e.status_code)
    except Exception as e:
        return error_response(f'Password update failed: {str(e)}', 500)
