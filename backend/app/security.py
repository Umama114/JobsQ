"""Passwords (Argon2id with a server-side pepper) and random tokens (only their hashes are stored)."""
import hashlib
import hmac
import secrets
from argon2 import PasswordHasher
from argon2.exceptions import VerificationError, InvalidHashError
from . import config

_ph = PasswordHasher()  # Argon2id with a random per-password salt


def _peppered(password: str) -> str:
    return hmac.new(config.PASSWORD_PEPPER.encode(), password.encode(), hashlib.sha256).hexdigest()


def hash_password(password: str) -> str:
    return _ph.hash(_peppered(password))


def check_password(stored_hash: str, password: str) -> bool:
    try:
        return _ph.verify(stored_hash, _peppered(password))
    except (VerificationError, InvalidHashError):
        return False


def new_token() -> str:
    return secrets.token_urlsafe(32)


def token_hash(token: str) -> str:
    return hashlib.sha256(token.encode()).hexdigest()


def digits(phone: str) -> str:
    return "".join(ch for ch in str(phone) if ch.isdigit())
