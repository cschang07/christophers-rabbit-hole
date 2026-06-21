import os

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import RedirectResponse
from google_auth_oauthlib.flow import Flow
from sqlalchemy import delete
from sqlalchemy.orm import Session

from ..database import get_db
from ..google_sync import SCOPES, get_credential_row, run_sync
from ..google_tokens import oauth_client_credentials
from ..models import GoogleCredential, GoogleTombstone

router = APIRouter(prefix="/api/google", tags=["google"])


def _client_config():
    client_id, client_secret = oauth_client_credentials()
    redirect_uri = os.environ.get(
        "GOOGLE_REDIRECT_URI", "http://localhost:3008/api/google/callback"
    )
    if not client_id or not client_secret:
        return None
    return {
        "web": {
            "client_id": client_id,
            "client_secret": client_secret,
            "auth_uri": "https://accounts.google.com/o/oauth2/auth",
            "token_uri": "https://oauth2.googleapis.com/token",
            "redirect_uris": [redirect_uri],
        }
    }, redirect_uri


@router.get("/status")
def status(db: Session = Depends(get_db)):
    return {
        "configured": _client_config() is not None,
        "connected": get_credential_row(db) is not None,
    }


@router.get("/auth-url")
def auth_url():
    cfg = _client_config()
    if not cfg:
        raise HTTPException(400, "GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET not set")
    config, redirect_uri = cfg
    flow = Flow.from_client_config(config, scopes=SCOPES, redirect_uri=redirect_uri)
    url, _state = flow.authorization_url(
        access_type="offline", prompt="consent", include_granted_scopes="true"
    )
    return {"url": url}


@router.get("/callback")
def callback(code: str, db: Session = Depends(get_db)):
    cfg = _client_config()
    if not cfg:
        raise HTTPException(400, "Google OAuth not configured")
    config, redirect_uri = cfg
    flow = Flow.from_client_config(config, scopes=SCOPES, redirect_uri=redirect_uri)
    flow.fetch_token(code=code)
    row = get_credential_row(db)
    if row:
        row.token_json = flow.credentials.to_json()
        row.sync_token = None
    else:
        db.add(GoogleCredential(id=1, token_json=flow.credentials.to_json()))
    db.commit()
    return RedirectResponse("/calendar?google=connected")


@router.post("/sync")
def sync(db: Session = Depends(get_db)):
    if not get_credential_row(db):
        raise HTTPException(400, "Google account not connected")
    try:
        return run_sync(db)
    except Exception as e:  # surface a readable error to the UI
        raise HTTPException(502, f"Sync failed: {e}")


@router.post("/disconnect", status_code=204)
def disconnect(db: Session = Depends(get_db)):
    # local copies of events are kept; they just stop syncing
    db.execute(delete(GoogleCredential))
    db.execute(delete(GoogleTombstone))
    db.commit()
