"""Application configuration."""
import os
from dotenv import load_dotenv

load_dotenv()


class Config:
    """Base configuration."""

    # Flask
    SECRET_KEY = os.getenv('JWT_SECRET', 'dev-secret-key')
    FLASK_ENV = os.getenv('FLASK_ENV', 'development')
    DEBUG = FLASK_ENV == 'development'

    # Supabase
    SUPABASE_URL = os.getenv('SUPABASE_URL')
    SUPABASE_ANON_KEY = os.getenv('SUPABASE_ANON_KEY')
    SUPABASE_SERVICE_ROLE_KEY = os.getenv('SUPABASE_SERVICE_ROLE_KEY')

    # OpenAI (kept for other AI features)
    OPENAI_API_KEY = os.getenv('OPENAI_API_KEY')

    # OpenAI TTS (text-to-speech for AI interviewer voice)
    TTS_VOICE = os.getenv('TTS_VOICE', 'onyx')
    TTS_MODEL = os.getenv('TTS_MODEL', 'tts-1')

    # Groq (primary AI for interview coaching)
    GROQ_API_KEY = os.getenv('GROQ_API_KEY')
    GROQ_MODEL = os.getenv('GROQ_MODEL', 'llama-3.1-8b-instant')
    GROQ_MAX_TOKENS = int(os.getenv('GROQ_MAX_TOKENS', '700'))
    GROQ_TEMPERATURE = float(os.getenv('GROQ_TEMPERATURE', '0.5'))

    # Data encryption (Fernet/AES for chat message content at rest)
    ENCRYPTION_KEY = os.getenv('ENCRYPTION_KEY', '')
    ENABLE_ENCRYPTION = os.getenv('ENABLE_ENCRYPTION', 'false').lower() == 'true'

    # Data retention policy
    DATA_RETENTION_DAYS = int(os.getenv('DATA_RETENTION_DAYS', '90'))

    # Frontend URL (for Supabase email redirect links)
    FRONTEND_URL = os.getenv('FRONTEND_URL', 'http://localhost:3000')

    # CORS — set CORS_ORIGINS env var to a comma-separated list for production
    # e.g. "https://intervuai.vercel.app,https://www.intervuai.com"
    CORS_ORIGINS = [
        origin.strip()
        for origin in os.getenv('CORS_ORIGINS', 'http://localhost:3000,http://localhost:5173').split(',')
    ]

    @staticmethod
    def validate():
        """Validate required configuration."""
        required = [
            'SUPABASE_URL',
            'SUPABASE_ANON_KEY',
            'SUPABASE_SERVICE_ROLE_KEY',
            'GROQ_API_KEY',
        ]

        missing = []
        for key in required:
            if not os.getenv(key):
                missing.append(key)

        if missing:
            raise ValueError(f"Missing required environment variables: {', '.join(missing)}")


class DevelopmentConfig(Config):
    """Development configuration."""
    DEBUG = True


class ProductionConfig(Config):
    """Production configuration."""
    DEBUG = False


class TestingConfig(Config):
    """Testing configuration — skips env var validation."""
    TESTING = True
    DEBUG = False
    SECRET_KEY = 'test-secret-key'
    SUPABASE_URL = 'https://test.supabase.co'
    SUPABASE_ANON_KEY = 'test-anon-key'
    SUPABASE_SERVICE_ROLE_KEY = 'test-service-key'
    OPENAI_API_KEY = 'test-openai-key'

    @staticmethod
    def validate():
        """No validation needed for tests."""
        pass


config = {
    'development': DevelopmentConfig,
    'production': ProductionConfig,
    'testing': TestingConfig,
    'default': DevelopmentConfig
}
