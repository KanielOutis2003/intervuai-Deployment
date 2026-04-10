"""
Fernet (AES-128-CBC + HMAC-SHA256) encryption helpers for data at rest.

Usage:
  from app.utils.encryption import encrypt_text, decrypt_text

Content stored in the DB is prefixed with 'enc:' when encryption is enabled.
If ENABLE_ENCRYPTION=false (default) or ENCRYPTION_KEY is absent, the
functions are no-ops — no ciphertext is written and existing plaintext reads
work as before.

Key generation (run once, paste result into .env):
  python -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())"
"""
import logging
from app.config.config import Config

logger = logging.getLogger(__name__)

_fernet = None
_init_attempted = False


def _get_fernet():
    """Lazy-initialise Fernet singleton; returns None if encryption is disabled."""
    global _fernet, _init_attempted
    if _init_attempted:
        return _fernet
    _init_attempted = True

    if not Config.ENABLE_ENCRYPTION:
        return None

    key = (Config.ENCRYPTION_KEY or '').strip()
    if not key:
        logger.warning(
            '[encryption] ENABLE_ENCRYPTION=true but ENCRYPTION_KEY is empty. '
            'Encryption disabled — set a valid Fernet key in .env.'
        )
        return None

    try:
        from cryptography.fernet import Fernet
        _fernet = Fernet(key.encode())
        logger.info('[encryption] Fernet encryption enabled.')
    except Exception as exc:
        logger.error('[encryption] Invalid ENCRYPTION_KEY: %s', exc)
    return _fernet


def encrypt_text(text: str) -> str:
    """
    Encrypt a plaintext string.

    Returns ciphertext prefixed with 'enc:' when encryption is active,
    otherwise returns the original text unchanged.
    """
    if not text:
        return text
    f = _get_fernet()
    if f is None:
        return text
    try:
        return 'enc:' + f.encrypt(text.encode()).decode()
    except Exception as exc:
        logger.error('[encryption] encrypt_text failed: %s', exc)
        return text


def decrypt_text(text: str) -> str:
    """
    Decrypt a ciphertext string that starts with 'enc:'.

    Returns the original plaintext. If encryption is disabled or the value
    is not encrypted (no 'enc:' prefix), the value is returned as-is so
    that existing unencrypted records continue to work after enabling
    encryption.
    """
    if not text or not text.startswith('enc:'):
        return text
    f = _get_fernet()
    if f is None:
        # Encryption disabled but ciphertext found — return as-is (safe fallback)
        return text
    try:
        return f.decrypt(text[4:].encode()).decode()
    except Exception as exc:
        logger.warning('[encryption] decrypt_text failed: %s', exc)
        return text


def generate_key() -> str:
    """Generate a new Fernet key suitable for use as ENCRYPTION_KEY in .env."""
    from cryptography.fernet import Fernet
    return Fernet.generate_key().decode()
