"""Subscription service for managing plans and user subscriptions."""
import logging

from typing import Dict, Any, List, Optional
from app.config.supabase_client import supabase_admin
from app.utils.responses import APIError

logger = logging.getLogger(__name__)

logger = logging.getLogger(__name__)


class SubscriptionService:
    """Service class for subscription operations."""

    @staticmethod
    def get_plans() -> List[Dict[str, Any]]:
        """List all active subscription plans."""
        try:
            response = supabase_admin.table('subscription_plans').select('*').eq('is_active', True).order('price').execute()

            return [{
                "id": p['id'], "name": p['name'], "description": p.get('description'),
                "price": float(p.get('price', 0)), "features": p.get('features', []),
                "limits": p.get('limits', {}), "isActive": p.get('is_active')
            } for p in response.data]
        except Exception as e:
            raise APIError(f"Failed to get plans: {str(e)}", 500)

    @staticmethod
    def get_user_subscription(user_id: str) -> Optional[Dict[str, Any]]:
        """Get current subscription for a user."""
        try:
            response = supabase_admin.table('user_subscriptions').select(
                '*, subscription_plans(name, description, price, features, limits)'
            ).eq('user_id', user_id).eq('status', 'active').execute()

            if not response.data:
                return None

            s = response.data[0]
            plan = s.get('subscription_plans', {})
            return {
                "id": s['id'], "planId": s['plan_id'], "status": s['status'],
                "startedAt": s.get('started_at'), "expiresAt": s.get('expires_at'),
                "plan": {
                    "name": plan.get('name'), "description": plan.get('description'),
                    "price": float(plan.get('price', 0)), "features": plan.get('features', []),
                    "limits": plan.get('limits', {})
                }
            }
        except Exception as e:
            logger.exception('get_user_subscription failed: %s', str(e))
            raise APIError(f"Failed to get subscription: {str(e)}", 500)

    @staticmethod
    def is_premium(user_id: str) -> bool:
        """Check if a user has premium role OR an active (non-free) subscription."""
        # Check user_profiles.role first
        try:
            profile = supabase_admin.table('user_profiles').select('role').eq('user_id', user_id).execute()
            if profile.data and profile.data[0].get('role') == 'premium':
                return True
        except Exception:
            logger.exception('is_premium: failed to check user role for %s', user_id)

        # Fall back to checking user_subscriptions table
        sub = SubscriptionService.get_user_subscription(user_id)
        return sub is not None

    @staticmethod
    def subscribe(user_id: str, plan_id: str) -> Dict[str, Any]:
        """Subscribe a user to a plan."""
        try:
            # Verify plan exists
            plan_response = supabase_admin.table('subscription_plans').select('*').eq('id', plan_id).eq('is_active', True).execute()
            if not plan_response.data:
                raise APIError("Plan not found or inactive", 404)

            # Cancel existing active subscription
            supabase_admin.table('user_subscriptions').update(
                {'status': 'cancelled'}
            ).eq('user_id', user_id).eq('status', 'active').execute()

            # Create new subscription
            response = supabase_admin.table('user_subscriptions').insert({
                'user_id': user_id, 'plan_id': plan_id, 'status': 'active'
            }).execute()

            if not response.data:
                raise APIError("Failed to create subscription", 500)

            # Promote user role to premium
            supabase_admin.table('user_profiles').update(
                {'role': 'premium'}
            ).eq('user_id', str(user_id)).execute()
            logger.info('[subscribe] role updated to premium for user_id=%s', user_id)

            s = response.data[0]
            return {
                "id": str(s['id']), "planId": str(s['plan_id']), "status": s['status'],
                "startedAt": s.get('started_at'), "message": "Subscription activated",
                "role": "premium"
            }
        except APIError:
            raise
        except Exception as e:
            raise APIError(f"Failed to subscribe: {str(e)}", 500)

    @staticmethod
    def cancel_subscription(user_id: str) -> Dict[str, str]:
        """Cancel a user's active subscription."""
        try:
            response = supabase_admin.table('user_subscriptions').update(
                {'status': 'cancelled'}
            ).eq('user_id', user_id).eq('status', 'active').execute()

            if not response.data:
                raise APIError("No active subscription found", 404)

            # Revert user role back to standard user
            supabase_admin.table('user_profiles').update(
                {'role': 'user'}
            ).eq('user_id', str(user_id)).execute()
            logger.info('[cancel] role reverted to user for user_id=%s', user_id)

            return {"message": "Subscription cancelled successfully"}
        except APIError:
            raise
        except Exception as e:
            raise APIError(f"Failed to cancel subscription: {str(e)}", 500)

    # Admin methods
    @staticmethod
    def admin_create_plan(name: str, price: float, description: str = None, features: list = None, limits: dict = None) -> Dict[str, Any]:
        """Create a new subscription plan (admin only)."""
        try:
            response = supabase_admin.table('subscription_plans').insert({
                'name': name, 'description': description, 'price': price,
                'features': features or [], 'limits': limits or {}
            }).execute()

            if not response.data:
                raise APIError("Failed to create plan", 500)

            p = response.data[0]
            return {"id": p['id'], "name": p['name'], "price": float(p.get('price', 0))}
        except APIError:
            raise
        except Exception as e:
            raise APIError(f"Failed to create plan: {str(e)}", 500)

    @staticmethod
    def admin_update_plan(plan_id: str, **kwargs) -> Dict[str, Any]:
        """Update a subscription plan (admin only)."""
        try:
            update_data = {k: v for k, v in kwargs.items() if v is not None}
            if not update_data:
                raise APIError("No update data provided", 400)

            response = supabase_admin.table('subscription_plans').update(update_data).eq('id', plan_id).execute()
            if not response.data:
                raise APIError("Plan not found", 404)

            return {"id": response.data[0]['id'], "message": "Plan updated"}
        except APIError:
            raise
        except Exception as e:
            raise APIError(f"Failed to update plan: {str(e)}", 500)
