from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import func, select, text
from sqlalchemy.orm import Session

from ..database import get_db
from ..models import Folder, Note
from ..schemas import (
    FolderCreate,
    FolderOut,
    NoteCreate,
    NoteOut,
    NoteUpdate,
)

router = APIRouter(prefix="/api", tags=["notes"])


def _derive_title(content: str) -> str:
    """First non-empty content line, heading markers stripped — used when title is blank."""
    for line in content.splitlines():
        line = line.strip().lstrip("#").strip()
        if line:
            return line[:120]
    return ""


# ---- folders ----


@router.get("/folders", response_model=list[FolderOut])
def list_folders(db: Session = Depends(get_db)):
    return db.scalars(select(Folder).order_by(Folder.name)).all()


@router.post("/folders", response_model=FolderOut, status_code=201)
def create_folder(payload: FolderCreate, db: Session = Depends(get_db)):
    if payload.parent_id is not None and not db.get(Folder, payload.parent_id):
        raise HTTPException(422, "Parent folder not found")
    folder = Folder(**payload.model_dump())
    db.add(folder)
    db.commit()
    db.refresh(folder)
    return folder


@router.put("/folders/{folder_id}", response_model=FolderOut)
def rename_folder(folder_id: int, payload: FolderCreate, db: Session = Depends(get_db)):
    folder = db.get(Folder, folder_id)
    if not folder:
        raise HTTPException(404, "Folder not found")
    folder.name = payload.name
    db.commit()
    db.refresh(folder)
    return folder


@router.delete("/folders/{folder_id}", status_code=204)
def delete_folder(folder_id: int, db: Session = Depends(get_db)):
    folder = db.get(Folder, folder_id)
    if not folder:
        raise HTTPException(404, "Folder not found")
    # notes and child folders fall back to root via ON DELETE SET NULL
    db.delete(folder)
    db.commit()


# ---- notes ----


@router.get("/notes", response_model=list[NoteOut])
def list_notes(
    folder_id: int | None = None,
    tag: str | None = None,
    q: str | None = Query(default=None, max_length=200),
    db: Session = Depends(get_db),
):
    stmt = select(Note)
    if q:
        # full-text search across all notes, ranked
        tsv = func.to_tsvector("english", Note.title + " " + Note.content)
        tsq = func.plainto_tsquery("english", q)
        stmt = stmt.where(tsv.op("@@")(tsq)).order_by(
            func.ts_rank(tsv, tsq).desc(), Note.updated_at.desc()
        )
    else:
        if folder_id is not None:
            stmt = stmt.where(Note.folder_id == folder_id)
        if tag:
            stmt = stmt.where(Note.tags.any(tag))
        stmt = stmt.order_by(Note.updated_at.desc())
    return db.scalars(stmt).all()


@router.get("/notes/tags", response_model=list[str])
def list_tags(db: Session = Depends(get_db)):
    rows = db.execute(
        text("SELECT DISTINCT unnest(tags) AS tag FROM notes ORDER BY tag")
    ).scalars()
    return list(rows)


@router.get("/notes/{note_id}", response_model=NoteOut)
def get_note(note_id: int, db: Session = Depends(get_db)):
    note = db.get(Note, note_id)
    if not note:
        raise HTTPException(404, "Note not found")
    return note


@router.post("/notes", response_model=NoteOut, status_code=201)
def create_note(payload: NoteCreate, db: Session = Depends(get_db)):
    note = Note(**payload.model_dump())
    db.add(note)
    db.commit()
    db.refresh(note)
    return note


@router.put("/notes/{note_id}", response_model=NoteOut)
def update_note(note_id: int, payload: NoteUpdate, db: Session = Depends(get_db)):
    note = db.get(Note, note_id)
    if not note:
        raise HTTPException(404, "Note not found")
    data = payload.model_dump(exclude_unset=True, exclude={"clear_folder"})
    if payload.clear_folder:
        data["folder_id"] = None
    for key, value in data.items():
        setattr(note, key, value)
    if not note.title.strip() and note.content.strip():
        note.title = _derive_title(note.content)
    db.commit()
    db.refresh(note)
    return note


@router.delete("/notes/{note_id}", status_code=204)
def delete_note(note_id: int, db: Session = Depends(get_db)):
    note = db.get(Note, note_id)
    if not note:
        raise HTTPException(404, "Note not found")
    db.delete(note)
    db.commit()
