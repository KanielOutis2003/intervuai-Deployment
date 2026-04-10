"""Audit logging middleware."""

from functools import wraps
from flask import request, g
from app.config.supabase_client import supabase_admin


def audit_log(action: str, resource_type: str = None):
    """Decorator to automatically log admin actions."""
    def decorator(f):
        @wraps(f)
        def decorated_function(*args, **kwargs):
            # Execute the original function
            result = f(*args, **kwargs)

            # Log the action after successful execution
            try:
                user = getattr(g, 'user', None)
                if user:
                    log_entry = {
                        'user_id': user['id'],
                        'action': action,
                        'resource_type': resource_type or f.__name__,
                        'resource_id': kwargs.get('id') or kwargs.get('question_id') or kwargs.get('role_id'),
                        'details': {
                            'method': request.method,
                            'path': request.path,
                            'user_agent': request.headers.get('User-Agent', '')[:200]
                        },
                        'ip_address': request.remote_addr
                    }
                    supabase_admin.table('audit_logs').insert(log_entry).execute()
            except Exception:
                # Don't fail the request if audit logging fails
                pass

            return result
        return decorated_function
    return decorator


def log_audit_event(user_id: str, action: str, resource_type: str = None, resource_id: str = None, details: dict = None):
    """Manually log an audit event."""
    try:
        supabase_admin.table('audit_logs').insert({
            'user_id': user_id,
            'action': action,
            'resource_type': resource_type,
            'resource_id': resource_id,
            'details': details or {},
            'ip_address': request.remote_addr if request else None
        }).execute()
    except Exception:
        pass
