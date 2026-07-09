"""Authenticate requests via Supabase Auth access tokens.

The frontend signs users in with Supabase (Google OAuth) and sends the
resulting access token as an `Authorization: Bearer <token>` header. We verify
that token by introspection — calling Supabase's `GET /auth/v1/user` endpoint —
which works regardless of Supabase's token signing scheme (legacy HS256 or the
newer asymmetric keys) and needs no extra dependency (`requests` is already a
backend dep). The returned user `id` (a UUID) is the stable per-account
identity used to scope stored papers and the daily extraction limit.

A small in-memory TTL cache avoids a network round-trip on every request.
"""

import os
import time

import requests

_CACHE_TTL_SECONDS = 60
_HTTP_TIMEOUT_SECONDS = 8

# token -> (user_id, expires_at_epoch)
_token_cache: dict[str, tuple[str, float]] = {}


def _config() -> tuple[str, str]:
    """Read Supabase settings from the environment at call time.

    Read lazily (not at import) because this module is imported before
    load_dotenv() runs in main.py — reading at import would capture empty
    values. The anon key is designed to be public.
    """
    url = os.environ.get("SUPABASE_URL", "").rstrip("/")
    anon_key = os.environ.get("SUPABASE_ANON_KEY", "")
    return url, anon_key


def _cache_get(token: str) -> str | None:
    hit = _token_cache.get(token)
    if not hit:
        return None
    user_id, expires_at = hit
    if time.time() >= expires_at:
        _token_cache.pop(token, None)
        return None
    return user_id


def verify_token(token: str) -> str | None:
    """Return the Supabase user id for a valid access token, else None.

    None means "not authenticated" (missing config, invalid/expired token, or
    Supabase unreachable) — callers should translate that into a 401.
    """
    if not token:
        return None
    url, anon_key = _config()
    if not url or not anon_key:
        # Misconfigured server: treat every request as unauthenticated rather
        # than silently trusting tokens.
        return None

    cached = _cache_get(token)
    if cached is not None:
        return cached

    try:
        resp = requests.get(
            f"{url}/auth/v1/user",
            headers={
                "apikey": anon_key,
                "Authorization": f"Bearer {token}",
            },
            timeout=_HTTP_TIMEOUT_SECONDS,
        )
    except requests.RequestException:
        return None

    if resp.status_code != 200:
        return None

    try:
        user_id = resp.json().get("id")
    except ValueError:
        return None

    if not user_id:
        return None

    _token_cache[token] = (user_id, time.time() + _CACHE_TTL_SECONDS)
    return user_id
