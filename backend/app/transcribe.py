"""Meeting recording -> Voxtral transcription -> new note.

Runs as a FastAPI background task. The original audio file is kept on the
recordings volume, so a failed transcription can always be retried.

Transcription only — no summarization. The note content is the raw transcript;
the user does their own summarizing.
"""

import os
import subprocess
from datetime import datetime
from pathlib import Path

from .database import SessionLocal
from .google_sync import TZ
from .models import Note, Recording

RECORDINGS_DIR = Path(os.environ.get("RECORDINGS_DIR", "/data/recordings"))
# Voxtral Mini Transcribe 2 — batch transcription, ~$0.003/min, strong on zh.
MISTRAL_MODEL = os.environ.get("MISTRAL_MODEL", "voxtral-mini-2602")


def _to_mp3(src: Path) -> Path:
    """Re-encode to mono 64k mp3 — small and universally accepted."""
    dst = src.with_suffix(".mp3")
    if dst.exists() and dst.stat().st_size > 0:
        return dst
    result = subprocess.run(
        ["ffmpeg", "-y", "-i", str(src), "-ac", "1", "-b:a", "64k", str(dst)],
        capture_output=True,
        text=True,
    )
    if result.returncode != 0:
        raise RuntimeError(f"ffmpeg failed: {result.stderr[-400:]}")
    return dst


def _to_traditional(text: str) -> str:
    """Voxtral outputs Simplified Chinese; convert to Taiwan Traditional.
    No-op on non-Chinese text, so safe to always apply."""
    try:
        from opencc import OpenCC

        return OpenCC("s2twp").convert(text)
    except Exception:
        return text


def _voxtral_transcribe(mp3: Path) -> str:
    from mistralai import Mistral

    api_key = os.environ.get("MISTRAL_API_KEY")
    if not api_key:
        raise RuntimeError("MISTRAL_API_KEY not set")
    client = Mistral(api_key=api_key)

    with open(mp3, "rb") as f:
        response = client.audio.transcriptions.complete(
            model=MISTRAL_MODEL,
            file={"content": f, "file_name": mp3.name},
        )
    text = (getattr(response, "text", "") or "").strip()
    if not text:
        raise RuntimeError("Voxtral returned an empty transcript")
    return _to_traditional(text)


def process_recording(recording_id: int):
    db = SessionLocal()
    try:
        rec = db.get(Recording, recording_id)
        if not rec:
            return
        try:
            mp3 = _to_mp3(RECORDINGS_DIR / rec.filename)
            content = _voxtral_transcribe(mp3)
            title = f"Meeting {datetime.now(TZ).strftime('%Y-%m-%d %H:%M')}"
            note = Note(title=title, content=content, tags=["meeting"])
            db.add(note)
            db.flush()
            rec.note_id = note.id
            rec.status = "done"
            rec.error = ""
        except Exception as e:
            db.rollback()
            rec = db.get(Recording, recording_id)
            rec.status = "failed"
            rec.error = str(e)[:2000]
        db.commit()
    finally:
        db.close()
