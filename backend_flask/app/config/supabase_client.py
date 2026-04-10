"""Supabase client configuration."""
from supabase import create_client, Client
from app.config.config import Config

# Initialize Supabase clients
supabase: Client = create_client(
    Config.SUPABASE_URL,
    Config.SUPABASE_ANON_KEY
)

supabase_admin: Client = create_client(
    Config.SUPABASE_URL,
    Config.SUPABASE_SERVICE_ROLE_KEY
)
