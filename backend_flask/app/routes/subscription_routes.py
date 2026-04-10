"""Subscription routes for user-facing subscription management."""
import logging

from flask import Blueprint, g
from app.middleware.auth import require_auth
from app.services.subscription_service import SubscriptionService
from app.utils.responses import success_response, error_response, APIError
from app.utils.validation import validate_request, SubscribeSchema
from flask import request

logger = logging.getLogger(__name__)

subscription_bp = Blueprint('subscriptions', __name__, url_prefix='/api/subscriptions')


@subscription_bp.route('/plans', methods=['GET'])
def list_plans():
    """List available subscription plans (public)."""
    try:
        data = SubscriptionService.get_plans()
        return success_response(data)
    except APIError as e:
        return error_response(e.message, e.status_code)


@subscription_bp.route('/my-subscription', methods=['GET'])
@require_auth
def get_my_subscription():
    """Get current user's subscription."""
    try:
        data = SubscriptionService.get_user_subscription(g.user['id'])
        if not data:
            return success_response({"subscription": None, "message": "No active subscription"})
        return success_response(data)
    except APIError as e:
        return error_response(e.message, e.status_code)
    except Exception as e:
        logger.exception('get_my_subscription error: %s', str(e))
        return error_response(f'Internal server error: {str(e)}', 500)


@subscription_bp.route('/subscribe', methods=['POST'])
@require_auth
@validate_request(SubscribeSchema)
def subscribe():
    """Subscribe to a plan."""
    try:
        body = request.validated_data
        data = SubscriptionService.subscribe(g.user['id'], str(body['planId']))
        return success_response(data, status=201)
    except APIError as e:
        return error_response(e.message, e.status_code)


@subscription_bp.route('/cancel', methods=['POST'])
@require_auth
def cancel_subscription():
    """Cancel current subscription."""
    try:
        data = SubscriptionService.cancel_subscription(g.user['id'])
        return success_response(data)
    except APIError as e:
        return error_response(e.message, e.status_code)
