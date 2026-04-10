"""Admin routes for system management, question bank, job roles, and audit logs."""

from flask import Blueprint, request, g
from app.middleware.auth import require_admin
from app.middleware.audit import audit_log
from app.services.admin_service import AdminService
from app.services.subscription_service import SubscriptionService
from app.utils.responses import success_response, error_response, APIError
from app.utils.validation import (
    validate_request, AddBankQuestionSchema, CreateJobRoleSchema, CreatePlanSchema
)

admin_bp = Blueprint('admin', __name__, url_prefix='/api/admin')


# ── Dashboard ─────────────────────────────────────────────────────────────────

@admin_bp.route('/dashboard', methods=['GET'])
@require_admin
def dashboard():
    """Get admin dashboard metrics."""
    try:
        data = AdminService.get_dashboard_metrics()
        return success_response(data)
    except APIError as e:
        return error_response(e.message, e.status_code)


# ── System Config ─────────────────────────────────────────────────────────────

@admin_bp.route('/config', methods=['GET'])
@require_admin
def get_system_config():
    """Get system configuration with current API key and service status."""
    try:
        from app.config.config import Config
        import os
        data = {
            "environment":       Config.FLASK_ENV,
            "corsOrigins":       Config.CORS_ORIGINS,
            "hasGroqKey":        bool(os.environ.get('GROQ_API_KEY') or getattr(Config, 'GROQ_API_KEY', None)),
            "hasSupabaseConfig": bool(Config.SUPABASE_URL),
            "hasOpenAIKey":      bool(getattr(Config, 'OPENAI_API_KEY', None)),
        }
        return success_response(data)
    except Exception as e:
        return error_response(f"Failed to get config: {str(e)}", 500)


# ── Platform Analytics ────────────────────────────────────────────────────────

@admin_bp.route('/analytics', methods=['GET'])
@require_admin
def get_platform_analytics():
    """Get platform-wide analytics: score distribution, top roles, avg score."""
    try:
        data = AdminService.get_platform_analytics()
        return success_response(data)
    except APIError as e:
        return error_response(e.message, e.status_code)

@admin_bp.route('/analytics/timeseries', methods=['GET'])
@require_admin
def get_platform_timeseries():
    """Get platform-wide time-series (interviews/day, active users/week, completion rate)."""
    try:
        role = request.args.get('role') or None
        start = request.args.get('startDate') or None
        end   = request.args.get('endDate') or None
        rng   = request.args.get('range') or None
        data = AdminService.get_platform_timeseries(role=role, start_date=start, end_date=end, range_key=rng)
        return success_response(data)
    except APIError as e:
        return error_response(e.message, e.status_code)
    except Exception as e:
        return error_response(f"Failed to get time-series: {str(e)}", 500)

# ── User Management ───────────────────────────────────────────────────────────

@admin_bp.route('/users', methods=['GET'])
@require_admin
def list_users():
    """List all users with pagination."""
    try:
        limit  = request.args.get('limit',  100, type=int)
        offset = request.args.get('offset', 0,   type=int)
        data = AdminService.list_users(limit, offset)
        return success_response(data)
    except APIError as e:
        return error_response(e.message, e.status_code)


@admin_bp.route('/users/<user_id>/role', methods=['PATCH'])
@require_admin
@audit_log('update_user_role', 'user')
def update_user_role(user_id):
    """Update a user's role."""
    try:
        body = request.get_json()
        role = body.get('role')
        if not role:
            return error_response("role is required", 400)
        data = AdminService.update_user_role(user_id, role)
        return success_response(data)
    except APIError as e:
        return error_response(e.message, e.status_code)


@admin_bp.route('/users/<user_id>/block', methods=['PATCH'])
@require_admin
@audit_log('toggle_block', 'user')
def toggle_block_user(user_id):
    """Block or unblock a user."""
    try:
        body = request.get_json()
        blocked = body.get('blocked')
        if blocked is None:
            return error_response("'blocked' field is required", 400)
        data = AdminService.toggle_block(user_id, bool(blocked))
        return success_response(data)
    except APIError as e:
        return error_response(e.message, e.status_code)


@admin_bp.route('/users/<user_id>', methods=['DELETE'])
@require_admin
@audit_log('delete_user', 'user')
def delete_user(user_id):
    """Permanently delete a user account."""
    try:
        data = AdminService.delete_user(user_id)
        return success_response(data)
    except APIError as e:
        return error_response(e.message, e.status_code)


@admin_bp.route('/users/<user_id>', methods=['PATCH'])
@require_admin
@audit_log('update_user_details', 'user')
def update_user_details(user_id):
    """Update a user's details (name, email, password)."""
    try:
        body = request.get_json()
        data = AdminService.update_user_details(
            user_id=user_id,
            full_name=body.get('fullName'),
            email=body.get('email'),
            password=body.get('password')
        )
        return success_response(data)
    except APIError as e:
        return error_response(e.message, e.status_code)
    except Exception as e:
        return error_response(f"Failed to update user: {str(e)}", 500)


# ── Interview Management ──────────────────────────────────────────────────────

@admin_bp.route('/interviews', methods=['GET'])
@require_admin
def list_all_interviews():
    """List all interviews across all users."""
    try:
        data = AdminService.list_all_interviews(
            status=request.args.get('status'),
            job_role=request.args.get('jobRole'),
            limit=request.args.get('limit',  50,  type=int),
            offset=request.args.get('offset', 0,  type=int),
        )
        return success_response(data)
    except APIError as e:
        return error_response(e.message, e.status_code)


@admin_bp.route('/interviews/<interview_id>', methods=['DELETE'])
@require_admin
@audit_log('delete_interview', 'interview')
def delete_interview(interview_id):
    """Delete an interview record."""
    try:
        data = AdminService.delete_interview(interview_id)
        return success_response(data)
    except APIError as e:
        return error_response(e.message, e.status_code)


# ── Question Bank ─────────────────────────────────────────────────────────────

@admin_bp.route('/questions', methods=['GET'])
@require_admin
def list_bank_questions():
    """List question bank entries with optional filters."""
    try:
        data = AdminService.list_bank_questions(
            category=request.args.get('category'),
            difficulty=request.args.get('difficulty'),
            job_role=request.args.get('jobRole'),
            limit=request.args.get('limit',  50, type=int),
            offset=request.args.get('offset', 0, type=int),
        )
        return success_response(data)
    except APIError as e:
        return error_response(e.message, e.status_code)


@admin_bp.route('/questions', methods=['POST'])
@require_admin
@validate_request(AddBankQuestionSchema)
@audit_log('add_question', 'question_bank')
def add_bank_question():
    """Add a question to the question bank."""
    try:
        body = request.validated_data
        data = AdminService.add_bank_question(
            question_text=body['questionText'],
            category=body['category'],
            difficulty=body['difficulty'],
            job_role=body.get('jobRole'),
            tags=body.get('tags'),
            expected_keywords=body.get('expectedKeywords'),
            created_by=g.user['id'],
        )
        return success_response(data, status=201)
    except APIError as e:
        return error_response(e.message, e.status_code)


@admin_bp.route('/questions/<question_id>', methods=['PATCH'])
@require_admin
@audit_log('update_question', 'question_bank')
def update_bank_question(question_id):
    """Update a question in the question bank."""
    try:
        body = request.get_json()
        data = AdminService.update_bank_question(question_id, **body)
        return success_response(data)
    except APIError as e:
        return error_response(e.message, e.status_code)


@admin_bp.route('/questions/<question_id>', methods=['DELETE'])
@require_admin
@audit_log('delete_question', 'question_bank')
def delete_bank_question(question_id):
    """Delete a question from the question bank."""
    try:
        data = AdminService.delete_bank_question(question_id)
        return success_response(data)
    except APIError as e:
        return error_response(e.message, e.status_code)


# ── Job Roles ─────────────────────────────────────────────────────────────────

@admin_bp.route('/job-roles', methods=['GET'])
@require_admin
def list_job_roles():
    """List all active job roles."""
    try:
        data = AdminService.list_job_roles(request.args.get('category'))
        return success_response(data)
    except APIError as e:
        return error_response(e.message, e.status_code)


@admin_bp.route('/job-roles', methods=['POST'])
@require_admin
@validate_request(CreateJobRoleSchema)
@audit_log('create_job_role', 'job_role')
def create_job_role():
    """Create a new job role."""
    try:
        body = request.validated_data
        data = AdminService.create_job_role(
            title=body['title'],
            description=body.get('description'),
            category=body.get('category'),
            required_skills=body.get('requiredSkills'),
        )
        return success_response(data, status=201)
    except APIError as e:
        return error_response(e.message, e.status_code)


@admin_bp.route('/job-roles/<role_id>', methods=['PATCH'])
@require_admin
@audit_log('update_job_role', 'job_role')
def update_job_role(role_id):
    """Update a job role."""
    try:
        body = request.get_json()
        data = AdminService.update_job_role(role_id, **body)
        return success_response(data)
    except APIError as e:
        return error_response(e.message, e.status_code)


@admin_bp.route('/job-roles/<role_id>', methods=['DELETE'])
@require_admin
@audit_log('delete_job_role', 'job_role')
def delete_job_role(role_id):
    """Delete a job role."""
    try:
        data = AdminService.delete_job_role(role_id)
        return success_response(data)
    except APIError as e:
        return error_response(e.message, e.status_code)


# ── Subscription Plans ────────────────────────────────────────────────────────

@admin_bp.route('/plans', methods=['GET'])
@require_admin
def list_plans():
    """List all subscription plans."""
    try:
        data = SubscriptionService.get_plans()
        return success_response(data)
    except APIError as e:
        return error_response(e.message, e.status_code)


@admin_bp.route('/plans', methods=['POST'])
@require_admin
@validate_request(CreatePlanSchema)
@audit_log('create_plan', 'subscription_plan')
def create_plan():
    """Create a subscription plan."""
    try:
        body = request.validated_data
        data = SubscriptionService.admin_create_plan(
            name=body['name'],
            price=body['price'],
            description=body.get('description'),
            features=body.get('features'),
            limits=body.get('limits'),
        )
        return success_response(data, status=201)
    except APIError as e:
        return error_response(e.message, e.status_code)


@admin_bp.route('/plans/<plan_id>', methods=['PATCH'])
@require_admin
@audit_log('update_plan', 'subscription_plan')
def update_plan(plan_id):
    """Update a subscription plan."""
    try:
        body = request.get_json()
        data = SubscriptionService.admin_update_plan(plan_id, **body)
        return success_response(data)
    except APIError as e:
        return error_response(e.message, e.status_code)


@admin_bp.route('/plans/<plan_id>', methods=['DELETE'])
@require_admin
@audit_log('delete_plan', 'subscription_plan')
def delete_plan(plan_id):
    """Delete a subscription plan."""
    try:
        from app.config.supabase_client import supabase_admin as sb
        response = sb.table('subscription_plans').delete().eq('id', plan_id).execute()
        if not response.data:
            return error_response("Plan not found", 404)
        return success_response({"message": "Plan deleted successfully"})
    except Exception as e:
        return error_response(f"Failed to delete plan: {str(e)}", 500)


# ── Audit Logs ────────────────────────────────────────────────────────────────

@admin_bp.route('/audit-logs', methods=['GET'])
@require_admin
def get_audit_logs():
    """Query audit logs with optional filters."""
    try:
        from app.config.supabase_client import supabase_admin as sb

        limit         = request.args.get('limit',        50, type=int)
        offset        = request.args.get('offset',        0, type=int)
        user_id       = request.args.get('userId')
        action        = request.args.get('action')
        resource_type = request.args.get('resourceType')

        query = sb.table('audit_logs').select('*', count='exact')
        if user_id:       query = query.eq('user_id', user_id)
        if action:        query = query.ilike('action', f'%{action}%')
        if resource_type: query = query.ilike('resource_type', f'%{resource_type}%')

        response = query.order('created_at', desc=True).range(offset, offset + limit - 1).execute()

        logs = [{
            "id":           log['id'],
            "userId":       log.get('user_id'),
            "action":       log.get('action'),
            "resourceType": log.get('resource_type'),
            "resourceId":   log.get('resource_id'),
            "details":      log.get('details', {}),
            "ipAddress":    log.get('ip_address'),
            "userAgent":    log.get('user_agent'),
            "createdAt":    log['created_at'],
        } for log in response.data]

        return success_response({"logs": logs, "total": response.count or len(logs)})
    except Exception as e:
        return error_response(f"Failed to get audit logs: {str(e)}", 500)


# ── Data Retention ────────────────────────────────────────────────────────────

@admin_bp.route('/data/cleanup', methods=['POST'])
@require_admin
def data_cleanup():
    """
    Trigger data retention cleanup — deletes completed/cancelled interviews
    older than DATA_RETENTION_DAYS (default 90 days).

    Body (optional JSON):
        { "dry_run": true }   — preview count without deleting (default false)
        { "retention_days": 30 } — override configured retention period

    Returns:
        { deleted, eligible, cutoff, dry_run, retention_days }
    """
    try:
        from app.services.retention_service import RetentionService
        body = request.get_json(silent=True) or {}
        dry_run = bool(body.get('dry_run', False))
        retention_days = body.get('retention_days')
        if retention_days is not None:
            retention_days = int(retention_days)
        result = RetentionService.cleanup_old_data(dry_run=dry_run, retention_days=retention_days)
        return success_response(result)
    except Exception as e:
        return error_response(f"Data cleanup failed: {str(e)}", 500)


@admin_bp.route('/data/retention-stats', methods=['GET'])
@require_admin
def retention_stats():
    """Return count of records eligible for deletion under the current policy."""
    try:
        from app.services.retention_service import RetentionService
        return success_response(RetentionService.get_stats())
    except Exception as e:
        return error_response(f"Failed to get retention stats: {str(e)}", 500)
