"""Meeting recording -> Voxtral transcription -> new note.

Runs as a FastAPI background task. The original audio file is kept on the
recordings volume, so a failed transcription can always be retried.

Transcription only — no summarization. The note content is the raw transcript;
the user does their own summarizing.
"""

import os
import re
import subprocess
import tempfile
from datetime import datetime
from pathlib import Path

from .database import SessionLocal
from .google_sync import TZ
from .models import Note, Recording

RECORDINGS_DIR = Path(os.environ.get("RECORDINGS_DIR", "/data/recordings"))
# Voxtral Mini Transcribe 2 — batch transcription, ~$0.003/min, strong on zh.
MISTRAL_MODEL = os.environ.get("MISTRAL_MODEL", "voxtral-mini-2602")
# Voxtral caps a single request at 3h/500MB; splitting well below that keeps each
# request retryable and lets the UI show per-segment progress on marathon meetings.
SEGMENT_SECONDS = int(os.environ.get("TRANSCRIBE_SEGMENT_SECONDS", "3000"))  # 50 min
# Speaker diarization labels who said what. Speaker numbering is assigned per
# request, so diarized audio is sent whole up to just under the 3h cap — only
# beyond that do we split, accepting that numbering restarts in each part.
DIARIZE = os.environ.get("TRANSCRIBE_DIARIZE", "1") != "0"
DIARIZE_SEGMENT_SECONDS = int(os.environ.get("TRANSCRIBE_DIARIZE_SEGMENT_SECONDS", "10200"))  # 2h50m


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


def _duration_seconds(path: Path) -> float:
    result = subprocess.run(
        [
            "ffprobe", "-v", "error",
            "-show_entries", "format=duration",
            "-of", "default=noprint_wrappers=1:nokey=1",
            str(path),
        ],
        capture_output=True,
        text=True,
    )
    try:
        return float(result.stdout.strip())
    except ValueError:
        raise RuntimeError(
            f"ffprobe could not read duration of {path.name}: {result.stderr[-200:]}"
        ) from None


def _segment(mp3: Path, out_dir: Path, seconds: int) -> list[Path]:
    """Split into `seconds`-long mp3 parts (stream copy — cuts on frame boundaries)."""
    pattern = out_dir / f"{mp3.stem}_%03d.mp3"
    result = subprocess.run(
        [
            "ffmpeg", "-y", "-i", str(mp3),
            "-f", "segment", "-segment_time", str(seconds),
            "-c", "copy", str(pattern),
        ],
        capture_output=True,
        text=True,
    )
    if result.returncode != 0:
        raise RuntimeError(f"ffmpeg segment failed: {result.stderr[-400:]}")
    # ffmpeg can emit a trailing near-empty segment; Voxtral fails on it.
    # Filter by size (1s of 64k mp3 ≈ 8KB) — ffprobe chokes on empty files.
    parts = [p for p in sorted(out_dir.glob(f"{mp3.stem}_*.mp3")) if p.stat().st_size > 4096]
    if not parts:
        raise RuntimeError("segmentation produced no files")
    return parts


def _to_traditional(text: str) -> str:
    """Voxtral outputs Simplified Chinese; convert to Taiwan Traditional.
    No-op on non-Chinese text, so safe to always apply."""
    try:
        from opencc import OpenCC

        return OpenCC("s2twp").convert(text)
    except Exception:
        return text


# Voxtral's diarized decoder emits U+FFFD on syllables it can't resolve
# (fast/overlapping/faint speech). Collapse each run — plus any whitespace
# glued to it — into one readable marker so notes don't look corrupted.
_GARBLE_RE = re.compile(r"\s*�(?:[\s�]*�)?\s*")


def _mark_garble(text: str) -> str:
    return _GARBLE_RE.sub(" [聽不清] ", text).strip()


def _fmt_ts(seconds: float) -> str:
    s = int(seconds)
    return f"{s // 3600}:{s % 3600 // 60:02d}:{s % 60:02d}"


def _format_diarized(segments: list[dict], offset: float = 0.0) -> str:
    """Segments -> markdown transcript, merging consecutive same-speaker runs.

    Raw speaker ids are remapped to "Speaker 1..N" in order of first appearance.
    `offset` shifts timestamps so multi-part transcripts stay on a global clock.
    """
    labels: dict = {}
    runs: list[tuple[str, float, list[str]]] = []  # (label, start, texts)
    for seg in segments:
        text = (seg.get("text") or "").strip()
        if not text:
            continue
        sid = seg.get("speaker_id")
        label = labels.setdefault(sid, f"Speaker {len(labels) + 1}")
        start = offset + float(seg.get("start") or 0)
        if runs and runs[-1][0] == label:
            runs[-1][2].append(text)
        else:
            runs.append((label, start, [text]))
    return "\n\n".join(f"**{label}** [{_fmt_ts(start)}] {' '.join(texts)}" for label, start, texts in runs)


def _voxtral_transcribe(mp3: Path, offset: float = 0.0) -> str:
    import json

    from mistralai import Mistral

    api_key = os.environ.get("MISTRAL_API_KEY")
    if not api_key:
        raise RuntimeError("MISTRAL_API_KEY not set")
    client = Mistral(api_key=api_key)

    kwargs = {"diarize": True, "timestamp_granularities": ["segment"]} if DIARIZE else {}
    with open(mp3, "rb") as f:
        response = client.audio.transcriptions.complete(
            model=MISTRAL_MODEL,
            file={"content": f, "file_name": mp3.name},
            **kwargs,
        )
    if DIARIZE:
        segments = json.loads(response.model_dump_json()).get("segments") or []
        formatted = _format_diarized(segments, offset)
        if formatted:
            return _mark_garble(_to_traditional(formatted))
        # fall through to plain text if diarization returned nothing usable
    text = (getattr(response, "text", "") or "").strip()
    if not text:
        raise RuntimeError("Voxtral returned an empty transcript")
    return _mark_garble(_to_traditional(text))


def process_recording(recording_id: int):
    db = SessionLocal()
    try:
        rec = db.get(Recording, recording_id)
        if not rec:
            return
        try:
            mp3 = _to_mp3(RECORDINGS_DIR / rec.filename)
            duration = _duration_seconds(mp3)
            chunk = DIARIZE_SEGMENT_SECONDS if DIARIZE else SEGMENT_SECONDS
            # No slack when diarizing: chunk sits just under Voxtral's hard 3h
            # cap, so a 1.15x grace window would send >3h audio and fail.
            threshold = chunk if DIARIZE else chunk * 1.15
            if duration > threshold:
                with tempfile.TemporaryDirectory() as tmp:
                    parts = _segment(mp3, Path(tmp), chunk)
                    texts = []
                    offset = 0.0
                    for i, part in enumerate(parts, 1):
                        rec.progress = f"segment {i}/{len(parts)}"
                        db.commit()
                        text = _voxtral_transcribe(part, offset)
                        if DIARIZE:
                            # speaker numbering restarts per request — flag the seam
                            text = f"## Part {i}\n\n{text}"
                        texts.append(text)
                        offset += _duration_seconds(part)
                content = "\n\n".join(texts)
            else:
                content = _voxtral_transcribe(mp3)
            title = f"Meeting {datetime.now(TZ).strftime('%Y-%m-%d %H:%M')}"
            note = Note(title=title, content=content, tags=["meeting"])
            db.add(note)
            db.flush()
            rec.note_id = note.id
            rec.status = "done"
            rec.error = ""
            rec.progress = ""
        except Exception as e:
            db.rollback()
            rec = db.get(Recording, recording_id)
            rec.status = "failed"
            rec.error = str(e)[:2000]
            rec.progress = ""
        db.commit()
    finally:
        db.close()
