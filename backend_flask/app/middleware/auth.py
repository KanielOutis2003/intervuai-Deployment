"""Authentication middleware."""
import logging
from datetime import datetime
from functools import wraps
from flask import request, jsonify, g
from app.config.supabase_client import supabase, supabase_admin

logger = logging.getLogger(__name__)


def _classify_auth_error(exc):
    """Return a user-friendly message based on the exception text."""
    msg = str(exc).lower()
    if 'expired' in msg or 'jwt expired' in msg:
        return 'Your session has expired. Please sign in again.'
    if 'invalid' in msg or 'malformed' in msg or 'signature' in msg:
        return 'Invalid authentication token. Please sign in again.'
    if 'not found' in msg or 'user not found' in msg:
        return 'Account not found. Please sign in with a valid account.'
    return 'Authentication failed. Please sign in again.'


def _verify_token(token):
    """Verify a bearer token with Supabase and return (user, user_role, full_name).

    Raises an exception if the token is invalid or the user cannot be verified.
    """
    user = supabase.auth.get_user(token)
    if not user or not user.user:
        raise ValueError('Token did not return a valid user.')

    # Try with is_blocked column; fall back to basic query if column doesn't exist yet
    try:
        profile_response = supabase_admin.table('user_profiles').select(
            'role, full_name, is_blocked'
        ).eq('user_id', user.user.id).execute()
    except Exception:
        profile_response = supabase_admin.table('user_profiles').select(
            'role, full_name'
        ).eq('user_id', user.user.id).execute()

    user_role = 'user'
    full_name = None
    if profile_response.data:
        profile = profile_response.data[0]
        user_role = profile.get('role', 'user')
        full_name = profile.get('full_name')

        # Check if user is blocked
        if profile.get('is_blocked', False):
            raise ValueError('Your account has been suspended. Please contact support.')

        # Update last_active_at (fire-and-forget)
        try:
            supabase_admin.table('user_profiles').update({
                'last_active_at': datetime.utcnow().isoformat()
            }).eq('user_id', user.user.id).execute()
        except Exception:
            pass

    return user.user, user_role, full_name


def require_auth(f):
    """Decorator to protect routes with authentication."""
    @wraps(f)
    def decorated_function(*args, **kwargs):
        auth_header = request.headers.get('Authorization')

        if not auth_header or not auth_header.startswith('Bearer '):
            return jsonify({
                'success': False,
                'error': 'Authentication required. Please include a valid Bearer token.'
            }), 401

        token = auth_header.split(' ')[1]

        try:
            user_obj, user_role, full_name = _verify_token(token)
            g.user = {
                'id': user_obj.id,
                'email': user_obj.email,
                'role': user_role,
                'full_name': full_name
            }
            return f(*args, **kwargs)

        except Exception as exc:
            logger.warning('require_auth failed: %s', str(exc))
            return jsonify({
                'success': False,
                'error': _classify_auth_error(exc)
            }), 401

    return decorated_function


def optional_auth(f):
    """Decorator for optional authentication — attaches user context if a valid token is present."""
    @wraps(f)
    def decorated_function(*args, **kwargs):
        auth_header = request.headers.get('Authorization')

        if auth_header and auth_header.startswith('Bearer '):
            token = auth_header.split(' ')[1]
            try:
                user_obj, user_role, full_name = _verify_token(token)
                g.user = {
                    'id': user_obj.id,
                    'email': user_obj.email,
                    'role': user_role,
                    'full_name': full_name
                }
            except Exception:
                pass  # Silently ignore for optional auth

        return f(*args, **kwargs)

    return decorated_function


def require_admin(f):
    """Decorator to protect routes requiring admin role."""
    @wraps(f)
    def decorated_function(*args, **kwargs):
        auth_header = request.headers.get('Authorization')

        if not auth_header or not auth_header.startswith('Bearer '):
            return jsonify({
                'success': False,
                'error': 'Authentication required. Please include a valid Bearer token.'
            }), 401

        token = auth_header.split(' ')[1]

        try:
            user_obj, user_role, full_name = _verify_token(token)

            if not full_name and not user_role:
                return jsonify({
                    'success': False,
                    'error': 'User profile not found. Please complete your account setup.'
                }), 403

            if user_role != 'admin':
                return jsonify({
                    'success': False,
                    'error': 'Admin access required. You do not have permission to perform this action.'
                }), 403

            g.user = {
                'id': user_obj.id,
                'email': user_obj.email,
                'role': user_role,
                'full_name': full_name
            }
            return f(*args, **kwargs)

        except Exception as exc:
            logger.warning('require_admin failed: %s', str(exc))
            return jsonify({
                'success': False,
                'error': _classify_auth_error(exc)
            }), 401

    return decorated_function


def require_role(*allowed_roles):
    """Decorator to protect routes requiring specific roles."""
    def decorator(f):
        @wraps(f)
        def decorated_function(*args, **kwargs):
            auth_header = request.headers.get('Authorization')

            if not auth_header or not auth_header.startswith('Bearer '):
                return jsonify({
                    'success': False,
                    'error': 'Authentication required. Please include a valid Bearer token.'
                }), 401

            token = auth_header.split(' ')[1]

            try:
                user_obj, user_role, full_name = _verify_token(token)

                if user_role not in allowed_roles:
                    readable_roles = ', '.join(allowed_roles)
                    return jsonify({
                        'success': False,
                        'error': f'Access denied. This action requires one of the following roles: {readable_roles}.'
                    }), 403

                g.user = {
                    'id': user_obj.id,
                    'email': user_obj.email,
                    'role': user_role,
                    'full_name': full_name
                }
                return f(*args, **kwargs)

            except Exception as exc:
                logger.warning('require_role failed: %s', str(exc))
                return jsonify({
                    'success': False,
                    'error': _classify_auth_error(exc)
                }), 401

        return decorated_function
    return decorator
