from fastapi import FastAPI
from sqlalchemy import text

from . import models  # noqa: F401  (registers tables on Base)
from .database import Base, SessionLocal, engine
from .google_tokens import bootstrap_google_credentials
from .routers import events, google, notes, pomodoro, recordings, tasks

app = FastAPI(title="Productivity App")

Base.metadata.create_all(bind=engine)

# light migrations for columns added after a table already exists
with engine.begin() as conn:
    conn.execute(
        text(
            "ALTER TABLE events ADD COLUMN IF NOT EXISTS "
            "needs_push BOOLEAN NOT NULL DEFAULT TRUE"
        )
    )
    conn.execute(
        text(
            "ALTER TABLE tasks ADD COLUMN IF NOT EXISTS "
            "list_type VARCHAR(20) NOT NULL DEFAULT 'work'"
        )
    )
    conn.execute(
        text(
            "ALTER TABLE recordings ADD COLUMN IF NOT EXISTS "
            "progress VARCHAR(40) NOT NULL DEFAULT ''"
        )
    )

with SessionLocal() as db:
    bootstrap_google_credentials(db)

app.include_router(tasks.router)
app.include_router(events.router)
app.include_router(notes.router)
app.include_router(pomodoro.router)
app.include_router(google.router)
app.include_router(recordings.router)


@app.get("/api/health")
def health():
    return {"status": "ok"}
