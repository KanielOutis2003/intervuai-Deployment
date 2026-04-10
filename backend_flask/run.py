"""Flask application entry point."""
import os
from app import create_app

# Get configuration from environment
config_name = os.getenv('FLASK_ENV', 'development')

# Create Flask app
app = create_app(config_name)

if __name__ == '__main__':
    port = int(os.getenv('PORT', 5000))

    print(f"""
===============================================================
   IntervuAI Flask Backend Server

   Server running on port {port}
   Environment: {config_name}
   Health check: http://localhost:{port}/health
===============================================================
    """)

    app.run(
        host='0.0.0.0',
        port=port,
        debug=(config_name == 'development'),
        threaded=True
    )
