"""Public and authenticated testimonial routes."""
from flask import Blueprint, request, g

from app.middleware.auth import require_auth
from app.services.testimonial_service import TestimonialService
from app.utils.responses import success_response, error_response, APIError

testimonial_bp = Blueprint('testimonials', __name__, url_prefix='/api/testimonials')


@testimonial_bp.route('', methods=['GET'])
def list_public_testimonials():
    """List approved public testimonials, featured first."""
    try:
        data = TestimonialService.list_public()
        return success_response({"testimonials": data})
    except APIError as exc:
        return error_response(exc.message, exc.status_code)


@testimonial_bp.route('', methods=['POST'])
@require_auth
def create_testimonial():
    """Submit a Premium-user testimonial for admin review."""
    try:
        data = TestimonialService.create(g.user['id'], request.get_json() or {})
        return success_response(data, message="Testimonial submitted for review", status=201)
    except APIError as exc:
        return error_response(exc.message, exc.status_code)
