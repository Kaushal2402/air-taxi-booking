from __future__ import annotations


def make_key(key: str, in_s3: bool) -> str:
    """Return the value to persist in DB.

    S3 uploads   → "s3:avatars/user.jpg"
    Local uploads → "avatars/user.jpg"
    """
    return f"s3:{key}" if in_s3 else key


def resolve_url(key: str | None) -> str | None:
    """Convert a stored key to a serveable URL.

    Stored value formats:
      "s3:avatars/user.jpg"       → S3 public URL
      "avatars/user.jpg"          → local /static/ URL
      "http(s)://..."             → legacy full URL, pass through unchanged
    """
    if not key:
        return None

    if key.startswith("http://") or key.startswith("https://"):
        return key  # legacy full URL — serve as-is

    try:
        from app.config import get_settings
        from app.dynamic_config import dyn
        cfg = get_settings()

        if key.startswith("s3:"):
            raw = key[3:]  # strip prefix
            bucket = dyn.get("AWS_BUCKET") or ""
            region = dyn.get("AWS_REGION") or "us-east-1"
            return f"https://{bucket}.s3.{region}.amazonaws.com/{raw}"

        # Plain key → stored locally
        return f"{cfg.BACKEND_URL}/static/{key}"

    except Exception:
        pass

    return f"/static/{key}"
