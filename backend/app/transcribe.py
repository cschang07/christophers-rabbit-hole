"""Meeting recording -> Gemini transcription -> new note.

Runs as a FastAPI background task. The original audio file is kept on the
recordings volume, so a failed transcription can always be retried.
"""

import os
import subprocess
import time
from datetime import datetime
from pathlib import Path

from .database import SessionLocal
from .google_sync import TZ
from .models import Note, Recording

RECORDINGS_DIR = Path(os.environ.get("RECORDINGS_DIR", "/data/recordings"))
GEMINI_MODEL = os.environ.get("GEMINI_MODEL", "gemini-2.5-flash")

PROMPT = """You will receive a meeting recording. Output Markdown only, in exactly this structure:

## Summary
Bullet points covering decisions made, action items (with owners if mentioned), and the key discussion points.

## Transcript
The full transcript, split into paragraphs by speaker turns. If you can tell speakers apart, label them (Speaker 1:, Speaker 2:, ...).

Rules: write in the language spoken in the audio — if the meeting is in Chinese, use Traditional Chinese. Transcribe faithfully; do not invent content for inaudible parts, mark them [inaudible]. Do not add any preface or closing remarks."""


def _to_mp3(src: Path) -> Path:
    """Re-encode to mono 64k mp3 — a format Gemini reliably accepts, and small."""
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


def _gemini_transcribe(mp3: Path) -> str:
    from google import genai

    api_key = os.environ.get("GEMINI_API_KEY")
    if not api_key:
        raise RuntimeError("GEMINI_API_KEY not set")
    client = genai.Client(api_key=api_key)

    uploaded = client.files.upload(file=str(mp3))
    deadline = time.time() + 600
    while getattr(uploaded.state, "name", str(uploaded.state)) == "PROCESSING":
        if time.time() > deadline:
            raise RuntimeError("Gemini file processing timed out")
        time.sleep(5)
        uploaded = client.files.get(name=uploaded.name)
    state = getattr(uploaded.state, "name", str(uploaded.state))
    if state != "ACTIVE":
        raise RuntimeError(f"Gemini rejected the audio file (state={state})")

    response = client.models.generate_content(
        model=GEMINI_MODEL, contents=[uploaded, PROMPT]
    )
    text = (response.text or "").strip()
    if not text:
        raise RuntimeError("Gemini returned an empty transcript")
    return text


def process_recording(recording_id: int):
    db = SessionLocal()
    try:
        rec = db.get(Recording, recording_id)
        if not rec:
            return
        try:
            mp3 = _to_mp3(RECORDINGS_DIR / rec.filename)
            content = _gemini_transcribe(mp3)
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
