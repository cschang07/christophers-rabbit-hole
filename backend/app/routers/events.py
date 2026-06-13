from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select
from sqlalchemy.orm import Session

from ..database import get_db
from ..models import Event, GoogleTombstone
from ..schemas import EventCreate, EventOut, EventUpdate

router = APIRouter(prefix="/api/events", tags=["events"])

# All datetimes are naive local time (single-user, single-timezone tool).


def _get_event(db: Session, event_id: int) -> Event:
    event = db.get(Event, event_id)
    if not event:
        raise HTTPException(404, "Event not found")
    return event


def _check_range(start_at: datetime, end_at: datetime):
    if end_at < start_at:
        raise HTTPException(422, "end_at must not be before start_at")


@router.get("", response_model=list[EventOut])
def list_events(
    start: datetime = Query(...),
    end: datetime = Query(...),
    db: Session = Depends(get_db),
):
    return db.scalars(
        select(Event)
        .where(Event.end_at >= start, Event.start_at < end)
        .order_by(Event.start_at)
    ).all()


@router.post("", response_model=EventOut, status_code=201)
def create_event(payload: EventCreate, db: Session = Depends(get_db)):
    _check_range(payload.start_at, payload.end_at)
    event = Event(**payload.model_dump())
    db.add(event)
    db.commit()
    db.refresh(event)
    return event


@router.put("/{event_id}", response_model=EventOut)
def update_event(event_id: int, payload: EventUpdate, db: Session = Depends(get_db)):
    event = _get_event(db, event_id)
    data = payload.model_dump(exclude_unset=True)
    for key, value in data.items():
        setattr(event, key, value)
    event.needs_push = True
    _check_range(event.start_at, event.end_at)
    db.commit()
    db.refresh(event)
    return event


@router.delete("/{event_id}", status_code=204)
def delete_event(event_id: int, db: Session = Depends(get_db)):
    event = _get_event(db, event_id)
    if event.google_event_id:
        db.merge(GoogleTombstone(google_event_id=event.google_event_id))
    db.delete(event)
    db.commit()
