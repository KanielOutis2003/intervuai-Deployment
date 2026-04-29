"""Supabase client configuration."""
import httpx
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


def _disable_http2(client: Client) -> None:
    """
    Replace the PostgREST transport with an HTTP/1.1-only httpx.Client.

    The default httpx transport uses HTTP/2, which triggers
    RemoteProtocolError (ConnectionTerminated) when the server closes a stream
    mid-flight — especially under concurrent dashboard requests on Render's
    free tier. Downgrading to HTTP/1.1 eliminates the race entirely.
    """
    try:
        old = client.postgrest.session
        client.postgrest.session = httpx.Client(
            base_url=old.base_url,
            headers=dict(old.headers),
            http2=False,
            timeout=httpx.Timeout(30.0),
        )
        old.close()
    except Exception:
        # Silently skip if the postgrest internals change across supabase-py versions.
        # The retry logic in services/user_service.py is the safety net.
        pass


_disable_http2(supabase)
_disable_http2(supabase_admin)
