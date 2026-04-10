"""Authentication service for user registration, login, and password management."""

import os
from typing import Dict, Any
from app.config.supabase_client import supabase, supabase_admin
from app.utils.responses import APIError


class AuthService:
    """Service class for authentication operations."""

    @staticmethod
    def register_user(email: str, password: str, full_name: str = None) -> Dict[str, Any]:
        """
        Register a new user via Supabase Auth.

        Args:
            email: User's email address
            password: User's password
            full_name: User's full name (optional)

        Returns:
            Dict containing user data and session info

        Raises:
            APIError: If registration fails
        """
        try:
            # Prepare user metadata
            user_metadata = {}
            if full_name:
                user_metadata['full_name'] = full_name

            # Register user via Supabase Auth
            frontend_url = os.getenv('FRONTEND_URL', 'http://localhost:3000')
            response = supabase.auth.sign_up({
                "email": email,
                "password": password,
                "options": {
                    "data": user_metadata,
                    "email_redirect_to": f"{frontend_url}/login"
                }
            })

            if not response.user:
                raise APIError("Registration failed", 400)

            # Create user_profiles row so login can fetch role/full_name
            try:
                supabase_admin.table('user_profiles').insert({
                    'user_id': response.user.id,
                    'full_name': full_name or '',
                    'role': 'user',
                }).execute()
            except Exception:
                pass  # Non-fatal — login still works with defaults

            return {
                "user": {
                    "id": response.user.id,
                    "email": response.user.email,
                    "full_name": full_name
                },
                "session": {
                    "access_token": response.session.access_token if response.session else None,
                    "refresh_token": response.session.refresh_token if response.session else None
                } if response.session else None
            }
        except APIError:
            raise
        except Exception as e:
            if hasattr(e, 'message'):
                raise APIError(f"Registration failed: {e.message}", 400)
            raise APIError(f"Registration failed: {str(e)}", 400)

    @staticmethod
    def login_user(email: str, password: str) -> Dict[str, Any]:
        """
        Sign in a user with email and password.

        Args:
            email: User's email address
            password: User's password

        Returns:
            Dict containing user data and session info

        Raises:
            APIError: If login fails
        """
        try:
            response = supabase.auth.sign_in_with_password({
                "email": email,
                "password": password
            })

            if not response.user or not response.session:
                raise APIError("Invalid credentials", 401)

            # Get user profile (non-fatal — default to 'user' role if missing)
            profile = None
            try:
                profile_response = supabase_admin.table('user_profiles').select('*').eq('user_id', response.user.id).execute()
                profile = profile_response.data[0] if profile_response.data else None
            except Exception:
                pass

            return {
                "user": {
                    "id": response.user.id,
                    "email": response.user.email,
                    "full_name": profile.get('full_name') if profile else None,
                    "role": profile.get('role', 'user') if profile else 'user'
                },
                "session": {
                    "access_token": response.session.access_token,
                    "refresh_token": response.session.refresh_token,
                    "expires_at": response.session.expires_at
                }
            }
        except APIError:
            raise
        except Exception as e:
            if hasattr(e, 'message'):
                raise APIError(f"Login failed: {e.message}", 401)
            raise APIError(f"Login failed: {str(e)}", 401)

    @staticmethod
    def logout_user(access_token: str) -> Dict[str, str]:
        """
        Sign out a user and invalidate their session.

        Args:
            access_token: User's access token

        Returns:
            Dict with success message

        Raises:
            APIError: If logout fails
        """
        try:
            # Set the session for the user
            supabase.auth.set_session(access_token, access_token)

            # Sign out
            supabase.auth.sign_out()

            return {"message": "Logged out successfully"}
        except Exception as e:
            raise APIError(f"Logout failed: {str(e)}", 400)

    @staticmethod
    def refresh_token(refresh_token: str) -> Dict[str, Any]:
        """
        Refresh an access token using a refresh token.

        Args:
            refresh_token: User's refresh token

        Returns:
            Dict containing new session info

        Raises:
            APIError: If token refresh fails
        """
        try:
            response = supabase.auth.refresh_session(refresh_token)

            if not response.session:
                raise APIError("Token refresh failed", 401)

            return {
                "session": {
                    "access_token": response.session.access_token,
                    "refresh_token": response.session.refresh_token,
                    "expires_at": response.session.expires_at
                }
            }
        except Exception as e:
            raise APIError(f"Token refresh failed: {str(e)}", 401)

    @staticmethod
    def forgot_password(email: str) -> Dict[str, str]:
        """
        Send a password reset email to the user.

        Args:
            email: User's email address

        Returns:
            Dict with success message

        Raises:
            APIError: If password reset email fails
        """
        try:
            frontend_url = os.getenv('FRONTEND_URL', 'http://localhost:3000')
            redirect_url = f"{frontend_url}/reset-password"

            supabase.auth.reset_password_email(email, {
                "redirect_to": redirect_url
            })

            return {"message": "Password reset email sent successfully"}
        except Exception as e:
            raise APIError(f"Password reset failed: {str(e)}", 400)

    @staticmethod
    def reset_password(access_token: str, new_password: str) -> Dict[str, str]:
        """
        Reset user's password using a reset token.

        Args:
            access_token: Password reset token from email
            new_password: New password

        Returns:
            Dict with success message

        Raises:
            APIError: If password reset fails
        """
        try:
            # Set the session with the reset token
            supabase.auth.set_session(access_token, access_token)

            # Update the password
            supabase.auth.update_user({
                "password": new_password
            })

            return {"message": "Password reset successfully"}
        except Exception as e:
            raise APIError(f"Password reset failed: {str(e)}", 400)

    @staticmethod
    def change_password(access_token: str, new_password: str) -> Dict[str, str]:
        """
        Change user's password using current access token.

        Args:
            access_token: Current access token
            new_password: New password

        Returns:
            Dict with success message

        Raises:
            APIError: If password change fails
        """
        try:
            # Set the session with the access token
            supabase.auth.set_session(access_token, access_token)

            # Update the password
            supabase.auth.update_user({
                "password": new_password
            })

            return {"message": "Password updated successfully"}
        except Exception as e:
            raise APIError(f"Password change failed: {str(e)}", 400)
