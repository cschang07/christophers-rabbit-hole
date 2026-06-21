"""Load Google OAuth client + user token from env and optional token file."""

import json
import os
from pathlib import Path

from sqlalchemy.orm import Session

from .google_sync import get_credential_row
from .models import GoogleCredential


def token_file_path() -> Path | None:
    raw = os.environ.get("GOOGLE_TOKEN_FILE", "").strip()
    if not raw:
        return None
    path = Path(raw)
    return path if path.is_file() else None


def load_token_file() -> dict | None:
    path = token_file_path()
    if not path:
        return None
    with path.open(encoding="utf-8") as f:
        return json.load(f)


def oauth_client_credentials() -> tuple[str, str]:
    client_id = os.environ.get("GOOGLE_CLIENT_ID", "").strip()
    client_secret = os.environ.get("GOOGLE_CLIENT_SECRET", "").strip()
    token = load_token_file()
    if token:
        client_id = client_id or str(token.get("client_id", "")).strip()
        client_secret = client_secret or str(token.get("client_secret", "")).strip()
    return client_id, client_secret


def bootstrap_google_credentials(db: Session) -> bool:
    """Seed DB credentials from GOOGLE_TOKEN_FILE when not yet connected."""
    if get_credential_row(db):
        return False
    token = load_token_file()
    if not token or not token.get("refresh_token"):
        return False
    db.add(GoogleCredential(id=1, token_json=json.dumps(token)))
    db.commit()
    return True
