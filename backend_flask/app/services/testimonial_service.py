"""Testimonial service for verified Premium-user reviews."""
from typing import Any, Dict, List

from app.config.supabase_client import supabase_admin
from app.services.subscription_service import SubscriptionService
from app.utils.responses import APIError


ALLOWED_TESTIMONIAL_STATUSES = {'pending', 'approved', 'rejected', 'hidden'}


def _normalize_testimonial(row: Dict[str, Any], user_name: str = None) -> Dict[str, Any]:
    """Convert Supabase testimonial rows to frontend-friendly camelCase."""
    return {
        "id": row.get("id"),
        "userId": row.get("user_id"),
        "userName": user_name,
        "rating": float(row.get("rating") or 0),
        "displayName": row.get("display_name"),
        "roleTitle": row.get("role_title"),
        "quote": row.get("quote"),
        "consentPublicDisplay": bool(row.get("consent_public_display")),
        "isPremiumAtSubmission": bool(row.get("is_premium_at_submission")),
        "status": row.get("status"),
        "featured": bool(row.get("featured")),
        "createdAt": row.get("created_at"),
        "updatedAt": row.get("updated_at"),
    }


class TestimonialService:
    """Service class for public, authenticated, and admin testimonial operations."""

    @staticmethod
    def list_public() -> List[Dict[str, Any]]:
        """Return approved public testimonials, featured first, newest next."""
        try:
            response = (
                supabase_admin
                .table('testimonials')
                .select('id, rating, display_name, role_title, quote, featured, created_at')
                .eq('status', 'approved')
                .eq('consent_public_display', True)
                .order('featured', desc=True)
                .order('created_at', desc=True)
                .execute()
            )
            return [
                {
                    "id": row.get("id"),
                    "rating": float(row.get("rating") or 0),
                    "displayName": row.get("display_name"),
                    "roleTitle": row.get("role_title"),
                    "quote": row.get("quote"),
                    "featured": bool(row.get("featured")),
                    "createdAt": row.get("created_at"),
                }
                for row in (response.data or [])
            ]
        except Exception as exc:
            raise APIError(f"Failed to load testimonials: {str(exc)}", 500)

    @staticmethod
    def create(user_id: str, body: Dict[str, Any]) -> Dict[str, Any]:
        """Create a pending testimonial after verifying premium status and consent."""
        rating = body.get('rating')
        display_name = (body.get('displayName') or body.get('display_name') or '').strip()
        role_title = (body.get('roleTitle') or body.get('role_title') or '').strip()
        quote = (body.get('quote') or '').strip()
        consent = bool(body.get('consentPublicDisplay', body.get('consent_public_display', False)))

        if rating is None:
            raise APIError("rating is required", 400)
        try:
            rating = float(rating)
        except (TypeError, ValueError):
            raise APIError("rating must be a number from 1 to 5", 400)
        if rating < 1 or rating > 5:
            raise APIError("rating must be between 1 and 5", 400)
        if not display_name:
            raise APIError("displayName is required", 400)
        if len(display_name) > 120:
            raise APIError("displayName must be 120 characters or fewer", 400)
        if len(role_title) > 160:
            raise APIError("roleTitle must be 160 characters or fewer", 400)
        if not quote:
            raise APIError("quote is required", 400)
        if len(quote) < 20:
            raise APIError("quote must be at least 20 characters", 400)
        if len(quote) > 800:
            raise APIError("quote must be 800 characters or fewer", 400)
        if not consent:
            raise APIError("Public display consent is required to submit a testimonial", 400)

        is_premium = SubscriptionService.is_premium(user_id)
        if not is_premium:
            raise APIError("Only Premium users can submit testimonials", 403)

        try:
            response = supabase_admin.table('testimonials').insert({
                'user_id': user_id,
                'rating': rating,
                'display_name': display_name,
                'role_title': role_title or None,
                'quote': quote,
                'consent_public_display': True,
                'is_premium_at_submission': True,
                'status': 'pending',
                'featured': False,
            }).execute()

            if not response.data:
                raise APIError("Failed to submit testimonial", 500)

            return _normalize_testimonial(response.data[0])
        except APIError:
            raise
        except Exception as exc:
            raise APIError(f"Failed to submit testimonial: {str(exc)}", 500)

    @staticmethod
    def list_admin() -> List[Dict[str, Any]]:
        """Return all testimonials for admin moderation."""
        try:
            response = (
                supabase_admin
                .table('testimonials')
                .select('*')
                .order('created_at', desc=True)
                .execute()
            )
            rows = response.data or []

            user_ids = list({row.get('user_id') for row in rows if row.get('user_id')})
            profile_names = {}
            if user_ids:
                profiles = (
                    supabase_admin
                    .table('user_profiles')
                    .select('user_id, full_name, role')
                    .in_('user_id', user_ids)
                    .execute()
                )
                profile_names = {
                    str(profile.get('user_id')): profile.get('full_name') or profile.get('role') or 'User'
                    for profile in (profiles.data or [])
                }

            return [
                _normalize_testimonial(row, profile_names.get(str(row.get('user_id'))))
                for row in rows
            ]
        except Exception as exc:
            raise APIError(f"Failed to load admin testimonials: {str(exc)}", 500)

    @staticmethod
    def update_admin(testimonial_id: str, body: Dict[str, Any]) -> Dict[str, Any]:
        """Moderate testimonial status and featured flag."""
        update_data = {}

        if 'status' in body:
            status = body.get('status')
            if status not in ALLOWED_TESTIMONIAL_STATUSES:
                raise APIError("status must be one of: pending, approved, rejected, hidden", 400)
            update_data['status'] = status

        if 'featured' in body:
            update_data['featured'] = bool(body.get('featured'))

        if not update_data:
            raise APIError("No supported testimonial fields supplied", 400)

        try:
            response = (
                supabase_admin
                .table('testimonials')
                .update(update_data)
                .eq('id', testimonial_id)
                .execute()
            )

            if not response.data:
                raise APIError("Testimonial not found", 404)

            return _normalize_testimonial(response.data[0])
        except APIError:
            raise
        except Exception as exc:
            raise APIError(f"Failed to update testimonial: {str(exc)}", 500)
