import hashlib
import time
import uuid
from collections import defaultdict
from datetime import UTC, datetime, timedelta
from typing import Any

import bcrypt
import jwt

from app.core.config import settings


def hash_password(password: str) -> str:
    """
    Hashes a plain-text password using bcrypt with a randomized salt.
    Bcrypt adds computational cost to resist brute-force attacks.
    """
    password_bytes = password.encode("utf-8")
    salt = bcrypt.gensalt(rounds=12)
    hashed = bcrypt.hashpw(password_bytes, salt)
    return hashed.decode("utf-8")


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """
    Verifies that a plain-text password matches the stored bcrypt hash.
    Returns True if valid, False otherwise.
    """
    try:
        return bcrypt.checkpw(
            plain_password.encode("utf-8"),
            hashed_password.encode("utf-8")
        )
    except Exception:
        return False


def hash_token(token: str) -> str:
    """
    Generates a SHA-256 fingerprint of a token.
    Used to safely persist active refresh tokens in the database without storing raw tokens.
    """
    return hashlib.sha256(token.encode("utf-8")).hexdigest()


def create_access_token(subject: str, expires_delta: timedelta | None = None) -> str:
    """
    Generates a cryptographically signed short-lived JWT access token.
    Contains `sub` (user_id), `type: "access"`, and unique `jti`.
    """
    if expires_delta:
        expire = datetime.now(UTC) + expires_delta
    else:
        expire = datetime.now(UTC) + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)

    payload: dict[str, Any] = {
        "sub": str(subject),
        "type": "access",
        "jti": uuid.uuid4().hex,
        "exp": expire,
        "iat": datetime.now(UTC)
    }

    return jwt.encode(payload, settings.JWT_SECRET_KEY, algorithm=settings.JWT_ALGORITHM)


def create_refresh_token(subject: str, expires_delta: timedelta | None = None) -> str:
    """
    Generates a cryptographically signed long-lived JWT refresh token.
    Contains `sub` (user_id), `type: "refresh"`, and unique `jti`.
    """
    if expires_delta:
        expire = datetime.now(UTC) + expires_delta
    else:
        expire = datetime.now(UTC) + timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS)

    payload: dict[str, Any] = {
        "sub": str(subject),
        "type": "refresh",
        "jti": uuid.uuid4().hex,
        "exp": expire,
        "iat": datetime.now(UTC)
    }

    return jwt.encode(payload, settings.JWT_SECRET_KEY, algorithm=settings.JWT_ALGORITHM)


def decode_token(token: str, expected_type: str | None = None) -> dict[str, Any] | None:
    """
    Decodes and verifies a JWT token.
    Validates expiration, signature, and optionally the token type ("access" or "refresh").
    """
    try:
        payload = jwt.decode(
            token,
            settings.JWT_SECRET_KEY,
            algorithms=[settings.JWT_ALGORITHM]
        )
        if expected_type and payload.get("type") != expected_type:
            # Backwards compatibility: allow tokens without type if expecting access
            if not (expected_type == "access" and "type" not in payload):
                return None
        return payload
    except jwt.PyJWTError:
        return None


# Backward-compatible alias
def decode_access_token(token: str) -> dict[str, Any] | None:
    return decode_token(token, expected_type="access")


# ==============================================================================
# In-Memory Rate Limiter for Login Protection
# Uses a sliding window timestamp queue per client key (IP or identifier).
# ==============================================================================
class LoginRateLimiter:
    def __init__(self):
        # Maps key -> list of float timestamps of failed attempts
        self._attempts: dict[str, list[float]] = defaultdict(list)

    def is_allowed(self, key: str) -> tuple[bool, int]:
        """
        Checks whether the given key is allowed to make another attempt.
        Returns (is_allowed, seconds_until_retry).
        """
        now = time.time()
        window = settings.RATE_LIMIT_LOGIN_WINDOW_SECONDS
        max_attempts = settings.RATE_LIMIT_LOGIN_MAX_ATTEMPTS

        # Retain only timestamps within the current sliding window
        valid_timestamps = [ts for ts in self._attempts[key] if now - ts < window]
        self._attempts[key] = valid_timestamps

        if len(valid_timestamps) >= max_attempts:
            oldest = valid_timestamps[0]
            retry_after = int(window - (now - oldest)) + 1
            return False, max(1, retry_after)

        return True, 0

    def record_failure(self, key: str):
        """Records a failed authentication attempt."""
        now = time.time()
        self._attempts[key].append(now)

    def clear(self, key: str):
        """Clears failed attempts upon successful authentication."""
        if key in self._attempts:
            del self._attempts[key]

    def reset_all(self):
        """Clears all tracked attempts across all keys."""
        self._attempts.clear()


login_rate_limiter = LoginRateLimiter()
