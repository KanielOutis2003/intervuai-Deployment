"""Flask application factory."""
import time
import logging
import uuid
import datetime
from flask import Flask, jsonify, request, g
from flask.json.provider import DefaultJSONProvider
from flask_cors import CORS
from app.config.config import config


class AppJSONProvider(DefaultJSONProvider):
    """Extend Flask's JSON provider to handle UUID and datetime objects."""
    def default(self, obj):
        if isinstance(obj, uuid.UUID):
            return str(obj)
        if isinstance(obj, (datetime.datetime, datetime.date)):
            return obj.isoformat()
        return super().default(obj)

logger = logging.getLogger(__name__)


def create_app(config_name='default'):
    """Create and configure Flask application."""
    app = Flask(__name__)
    app.json_provider_class = AppJSONProvider
    app.json = AppJSONProvider(app)

    # Load configuration
    app.config.from_object(config[config_name])

    # Validate configuration
    config[config_name].validate()

    # Configure logging
    logging.basicConfig(
        level=logging.INFO,
        format='%(asctime)s [%(levelname)s] %(name)s: %(message)s'
    )

    # Enable CORS
    CORS(app, resources={
        r"/api/*": {
            "origins": app.config['CORS_ORIGINS'],
            "methods": ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
            "allow_headers": ["Content-Type", "Authorization"]
        }
    })

    # Request / response timing (only log slow requests in production)
    @app.before_request
    def log_request():
        g.start_time = time.time()

    @app.after_request
    def log_response(response):
        duration_ms = round((time.time() - g.get('start_time', time.time())) * 1000)
        if duration_ms > 1000 or response.status_code >= 400:
            logger.info('%s %s -> %s (%dms)', request.method, request.path, response.status_code, duration_ms)
        return response

    # Health check endpoint
    @app.route('/health', methods=['GET'])
    def health_check():
        return jsonify({
            'success': True,
            'message': 'IntervuAI Flask Backend is running',
            'environment': app.config['FLASK_ENV']
        }), 200

    # Register blueprints
    from app.routes.auth_routes import auth_bp
    from app.routes.user_routes import user_bp
    from app.routes.session_routes import session_bp
    from app.routes.analysis_routes import analysis_bp
    from app.routes.interview_routes import interview_bp
    from app.routes.question_routes import question_bp
    from app.routes.feedback_routes import feedback_bp
    from app.routes.analytics_routes import analytics_bp
    from app.routes.resource_routes import resource_bp
    from app.routes.admin_routes import admin_bp
    from app.routes.subscription_routes import subscription_bp
    from app.routes.ai_routes import ai_bp
    from app.routes.tts_routes import tts_bp

    app.register_blueprint(auth_bp)
    app.register_blueprint(user_bp)
    app.register_blueprint(session_bp)
    app.register_blueprint(analysis_bp)
    app.register_blueprint(interview_bp)
    app.register_blueprint(question_bp)
    app.register_blueprint(feedback_bp)
    app.register_blueprint(analytics_bp)
    app.register_blueprint(resource_bp)
    app.register_blueprint(admin_bp)
    app.register_blueprint(subscription_bp)
    app.register_blueprint(ai_bp)
    app.register_blueprint(tts_bp)

    # HTTP error handlers
    @app.errorhandler(400)
    def bad_request(error):
        return jsonify({'success': False, 'error': 'Bad request. Please check your input and try again.'}), 400

    @app.errorhandler(401)
    def unauthorized(error):
        return jsonify({'success': False, 'error': 'Authentication required. Please sign in to continue.'}), 401

    @app.errorhandler(403)
    def forbidden(error):
        return jsonify({'success': False, 'error': 'You do not have permission to perform this action.'}), 403

    @app.errorhandler(404)
    def not_found(error):
        return jsonify({'success': False, 'error': 'The requested resource was not found.'}), 404

    @app.errorhandler(405)
    def method_not_allowed(error):
        return jsonify({'success': False, 'error': 'HTTP method not allowed on this endpoint.'}), 405

    @app.errorhandler(429)
    def too_many_requests(error):
        return jsonify({'success': False, 'error': 'Too many requests. Please slow down and try again.'}), 429

    @app.errorhandler(500)
    def internal_error(error):
        logger.exception('Internal server error: %s', str(error))
        return jsonify({'success': False, 'error': 'Internal server error. Please try again later.'}), 500

    # Global catch-all for any unhandled Python exception
    @app.errorhandler(Exception)
    def handle_unhandled_exception(error):
        logger.exception('Unhandled exception on %s %s: %s', request.method, request.path, str(error))
        return jsonify({
            'success': False,
            'error': 'An unexpected error occurred. Our team has been notified. Please try again.'
        }), 500

    return app
