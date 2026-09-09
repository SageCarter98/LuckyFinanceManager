import hashlib
import secrets
import uuid
from datetime import datetime, timedelta, timezone

from jose import JWTError, jwt
from passlib.context import CryptContext

from app.config import get_settings

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
settings = get_settings()


def hash_password(password: str) -> str:
    return pwd_context.hash(password)


def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)


def create_token(subject: str, *, expires_delta: timedelta, token_type: str) -> str:
    expire = datetime.now(timezone.utc) + expires_delta
    # jti guarantees uniqueness even when two tokens for the same subject and
    # type are minted within the same second, which would otherwise produce
    # byte-identical JWTs (found via test: it broke refresh-token rotation).
    payload = {"sub": subject, "exp": expire, "type": token_type, "jti": str(uuid.uuid4())}
    return jwt.encode(payload, settings.secret_key, algorithm=settings.algorithm)


def create_access_token(subject: str) -> str:
    return create_token(subject, expires_delta=timedelta(minutes=settings.access_token_expire_minutes), token_type="access")


def create_refresh_token(subject: str) -> str:
    return create_token(subject, expires_delta=timedelta(days=settings.refresh_token_expire_days), token_type="refresh")


def decode_token(token: str):
    try:
        return jwt.decode(token, settings.secret_key, algorithms=[settings.algorithm])
    except JWTError as exc:
        raise ValueError("Invalid token") from exc


def generate_opaque_token() -> str:
    """For one-time, out-of-band flows (email verification, password reset)
    that aren't bearer credentials on every request -- a plain random token
    is simpler and sufficient, unlike access/refresh tokens which need JWT's
    self-describing claims (type, expiry) to be checked without a DB hit."""
    return secrets.token_urlsafe(32)


def hash_token(token: str) -> str:
    """Refresh tokens are high-entropy already; a fast, non-reversible hash
    (not bcrypt, which is deliberately slow for password-guessing resistance
    that doesn't apply here) is the standard pattern for token-lookup storage."""
    return hashlib.sha256(token.encode("utf-8")).hexdigest()
