import os
from datetime import datetime

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, UploadFile
from pydantic import BaseModel, ConfigDict
from sqlalchemy import select
from sqlalchemy.orm import Session

from ..database import get_db
from ..models import Recording
from ..transcribe import RECORDINGS_DIR, process_recording

router = APIRouter(prefix="/api/recordings", tags=["recordings"])


class RecordingOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    status: str
    error: str
    note_id: int | None
    created_at: datetime


def _get(db: Session, recording_id: int) -> Recording:
    rec = db.get(Recording, recording_id)
    if not rec:
        raise HTTPException(404, "Recording not found")
    return rec


@router.get("", response_model=list[RecordingOut])
def list_recordings(db: Session = Depends(get_db)):
    return db.scalars(
        select(Recording).order_by(Recording.id.desc()).limit(10)
    ).all()


@router.post("", response_model=RecordingOut, status_code=201)
async def upload_recording(
    file: UploadFile, background: BackgroundTasks, db: Session = Depends(get_db)
):
    if not os.environ.get("MISTRAL_API_KEY"):
        raise HTTPException(400, "MISTRAL_API_KEY not set — add it to .env and restart")
    suffix = os.path.splitext(file.filename or "")[1].lower() or ".webm"
    name = f"rec_{datetime.now().strftime('%Y%m%d_%H%M%S_%f')}{suffix}"
    RECORDINGS_DIR.mkdir(parents=True, exist_ok=True)
    with open(RECORDINGS_DIR / name, "wb") as out:
        while chunk := await file.read(1 << 20):
            out.write(chunk)
    rec = Recording(filename=name, status="processing")
    db.add(rec)
    db.commit()
    db.refresh(rec)
    background.add_task(process_recording, rec.id)
    return rec


@router.post("/{recording_id}/retry", response_model=RecordingOut)
def retry_recording(
    recording_id: int, background: BackgroundTasks, db: Session = Depends(get_db)
):
    rec = _get(db, recording_id)
    if rec.status == "processing":
        raise HTTPException(409, "Already processing")
    if not (RECORDINGS_DIR / rec.filename).exists():
        raise HTTPException(410, "Audio file no longer exists")
    rec.status = "processing"
    rec.error = ""
    db.commit()
    db.refresh(rec)
    background.add_task(process_recording, rec.id)
    return rec


@router.delete("/{recording_id}", status_code=204)
def delete_recording(recording_id: int, db: Session = Depends(get_db)):
    rec = _get(db, recording_id)
    for path in (RECORDINGS_DIR / rec.filename, (RECORDINGS_DIR / rec.filename).with_suffix(".mp3")):
        path.unlink(missing_ok=True)
    db.delete(rec)
    db.commit()
