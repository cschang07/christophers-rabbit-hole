"""Two-way sync between local events and the user's primary Google Calendar.

Strategy: pull remote changes first (incremental via syncToken, remote wins
for google-linked events), then push local creates/edits (needs_push flag)
and deletions (tombstones). Single user, primary calendar only.
"""

import json
import os
from datetime import datetime, timedelta
from zoneinfo import ZoneInfo

from google.auth.transport.requests import Request
from google.oauth2.credentials import Credentials
from googleapiclient.discovery import build
from googleapiclient.errors import HttpError
from sqlalchemy import select
from sqlalchemy.orm import Session

from .models import Event, GoogleCredential, GoogleTombstone

SCOPES = ["https://www.googleapis.com/auth/calendar.events"]
TZ_NAME = os.environ.get("TIMEZONE", "Asia/Taipei")
TZ = ZoneInfo(TZ_NAME)


def get_credential_row(db: Session) -> GoogleCredential | None:
    return db.get(GoogleCredential, 1)


def _service(db: Session, row: GoogleCredential):
    creds = Credentials.from_authorized_user_info(json.loads(row.token_json), SCOPES)
    if creds.expired and creds.refresh_token:
        creds.refresh(Request())
        row.token_json = creds.to_json()
        db.commit()
    return build("calendar", "v3", credentials=creds, cache_discovery=False)


def _to_local_naive(value: str) -> datetime:
    return datetime.fromisoformat(value).astimezone(TZ).replace(tzinfo=None)


def _gtime(event: Event) -> tuple[dict, dict]:
    if event.all_day:
        return (
            {"date": event.start_at.date().isoformat()},
            {"date": event.end_at.date().isoformat()},
        )
    return (
        {"dateTime": event.start_at.isoformat(), "timeZone": TZ_NAME},
        {"dateTime": event.end_at.isoformat(), "timeZone": TZ_NAME},
    )


def _apply_remote(db: Session, item: dict) -> str:
    """Upsert/delete one Google event locally. Returns what happened."""
    gid = item["id"]
    local = db.scalar(select(Event).where(Event.google_event_id == gid))

    if item.get("status") == "cancelled":
        if local:
            db.delete(local)
            return "deleted"
        return "skipped"

    start, end = item.get("start", {}), item.get("end", {})
    all_day = "date" in start
    if all_day:
        start_at = datetime.fromisoformat(start["date"])
        end_at = datetime.fromisoformat(end["date"])
    elif "dateTime" in start:
        start_at = _to_local_naive(start["dateTime"])
        end_at = _to_local_naive(end["dateTime"])
    else:
        return "skipped"

    if local is None:
        local = Event(google_event_id=gid)
        db.add(local)
        action = "created"
    else:
        action = "updated"
    local.title = item.get("summary", "(no title)")
    local.description = item.get("description", "") or ""
    local.start_at = start_at
    local.end_at = end_at
    local.all_day = all_day
    local.needs_push = False
    return action


def run_sync(db: Session) -> dict:
    row = get_credential_row(db)
    if not row:
        raise RuntimeError("Google account not connected")
    service = _service(db, row)
    counts = {"pulled": 0, "pushed": 0, "deleted_remote": 0}

    # ---- pull ----
    params = {"calendarId": "primary", "singleEvents": True, "maxResults": 250}
    if row.sync_token:
        params["syncToken"] = row.sync_token
    else:
        now = datetime.now(TZ)
        params["timeMin"] = (now - timedelta(days=30)).isoformat()
        params["timeMax"] = (now + timedelta(days=365)).isoformat()

    page_token = None
    while True:
        if page_token:
            params["pageToken"] = page_token
        try:
            resp = service.events().list(**params).execute()
        except HttpError as e:
            if e.resp.status == 410:  # sync token expired -> full resync
                row.sync_token = None
                db.commit()
                return run_sync(db)
            raise
        for item in resp.get("items", []):
            if _apply_remote(db, item) != "skipped":
                counts["pulled"] += 1
        page_token = resp.get("nextPageToken")
        if not page_token:
            row.sync_token = resp.get("nextSyncToken")
            break
    db.commit()

    # ---- push deletions ----
    for tomb in db.scalars(select(GoogleTombstone)).all():
        try:
            service.events().delete(
                calendarId="primary", eventId=tomb.google_event_id
            ).execute()
            counts["deleted_remote"] += 1
        except HttpError as e:
            if e.resp.status not in (404, 410):  # already gone is fine
                raise
        db.delete(tomb)
    db.commit()

    # ---- push creates/updates ----
    for event in db.scalars(select(Event).where(Event.needs_push)).all():
        start, end = _gtime(event)
        body = {
            "summary": event.title,
            "description": event.description,
            "start": start,
            "end": end,
        }
        if event.google_event_id:
            try:
                service.events().patch(
                    calendarId="primary", eventId=event.google_event_id, body=body
                ).execute()
            except HttpError as e:
                if e.resp.status in (404, 410):  # deleted remotely; recreate
                    created = service.events().insert(calendarId="primary", body=body).execute()
                    event.google_event_id = created["id"]
                else:
                    raise
        else:
            created = service.events().insert(calendarId="primary", body=body).execute()
            event.google_event_id = created["id"]
        event.needs_push = False
        counts["pushed"] += 1
    db.commit()

    return counts
