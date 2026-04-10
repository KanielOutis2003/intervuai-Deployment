"""Resource routes for learning resources and tips."""

from flask import Blueprint, request, g
from app.middleware.auth import require_auth, require_admin
from app.services.resource_service import ResourceService
from app.utils.responses import success_response, error_response, APIError
from app.utils.validation import validate_request, CreateResourceSchema, UpdateResourceSchema

resource_bp = Blueprint('resources', __name__, url_prefix='/api/resources')


@resource_bp.route('', methods=['GET'])
@require_auth
def list_resources():
    """List resources with optional filters."""
    try:
        data = ResourceService.list_resources(
            category=request.args.get('category'),
            difficulty=request.args.get('difficulty'),
            resource_type=request.args.get('type'),
            search=request.args.get('search'),
            limit=request.args.get('limit', 20, type=int),
            offset=request.args.get('offset', 0, type=int)
        )
        return success_response(data)
    except APIError as e:
        return error_response(e.message, e.status_code)


@resource_bp.route('/<resource_id>', methods=['GET'])
@require_auth
def get_resource(resource_id):
    """Get a specific resource."""
    try:
        data = ResourceService.get_resource(resource_id)
        return success_response(data)
    except APIError as e:
        return error_response(e.message, e.status_code)


@resource_bp.route('', methods=['POST'])
@require_admin
@validate_request(CreateResourceSchema)
def create_resource():
    """Create a new resource (admin only)."""
    try:
        body = request.validated_data
        data = ResourceService.create_resource(
            title=body['title'],
            category=body['category'],
            resource_type=body['resourceType'],
            description=body.get('description'),
            content=body.get('content'),
            tags=body.get('tags'),
            difficulty=body.get('difficulty'),
            created_by=g.user['id']
        )
        return success_response(data, status=201)
    except APIError as e:
        return error_response(e.message, e.status_code)


@resource_bp.route('/<resource_id>', methods=['PATCH'])
@require_admin
def update_resource(resource_id):
    """Update a resource (admin only)."""
    try:
        body = request.get_json()
        data = ResourceService.update_resource(resource_id, **body)
        return success_response(data)
    except APIError as e:
        return error_response(e.message, e.status_code)


@resource_bp.route('/<resource_id>', methods=['DELETE'])
@require_admin
def delete_resource(resource_id):
    """Delete a resource (admin only)."""
    try:
        data = ResourceService.delete_resource(resource_id)
        return success_response(data)
    except APIError as e:
        return error_response(e.message, e.status_code)


@resource_bp.route('/<resource_id>/read', methods=['POST'])
@require_auth
def track_read(resource_id):
    """Increment read count for a resource (call when user opens it)."""
    try:
        data = ResourceService.track_read(resource_id)
        return success_response(data)
    except APIError as e:
        return error_response(e.message, e.status_code)


@resource_bp.route('/tips', methods=['GET'])
@require_auth
def get_tips():
    """Get tips and best practices."""
    try:
        category = request.args.get('category')
        limit = request.args.get('limit', 10, type=int)
        data = ResourceService.get_tips(category, limit)
        return success_response(data)
    except APIError as e:
        return error_response(e.message, e.status_code)


@resource_bp.route('/tips/personalized', methods=['GET'])
@require_auth
def get_personalized_tips():
    """Get personalized tips based on user performance."""
    try:
        from app.services.analytics_service import AnalyticsService

        # Get user trends to personalize tips
        trends = AnalyticsService.get_trends(g.user['id'])
        strongest = trends.get('strongestArea')
        # Suggest tips for the weaker area (opposite of strongest)
        tip_category = 'non-verbal' if strongest == 'verbal' else 'verbal'

        tips = ResourceService.get_tips(category=tip_category, limit=5)
        return success_response({
            "tips": tips,
            "basedOn": {
                "strongestArea": strongest,
                "suggestedFocus": tip_category
            }
        })
    except APIError as e:
        return error_response(e.message, e.status_code)
