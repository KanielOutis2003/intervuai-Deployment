"""Supabase client configuration."""
from supabase import create_client, Client
from supabase.lib.client_options import SyncClientOptions
from app.config.config import Config

# Use a longer timeout (30s) to survive Render free-tier cold starts
_opts = SyncClientOptions(postgrest_client_timeout=30)

# Initialize Supabase clients
supabase: Client = create_client(
    Config.SUPABASE_URL,
    Config.SUPABASE_ANON_KEY,
    options=_opts,
)

supabase_admin: Client = create_client(
    Config.SUPABASE_URL,
    Config.SUPABASE_SERVICE_ROLE_KEY,
    options=_opts,
)
