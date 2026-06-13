from datetime import datetime, timedelta

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from ..database import get_db
from ..models import PomodoroSession, Task

router = APIRouter(prefix="/api/pomodoro", tags=["pomodoro"])


class SessionIn(BaseModel):
    task_id: int | None = None
    kind: str = Field(pattern="^(work|break)$")
    minutes: int = Field(gt=0, le=180)


@router.post("/sessions", status_code=201)
def record_session(payload: SessionIn, db: Session = Depends(get_db)):
    if payload.task_id is not None:
        task = db.get(Task, payload.task_id)
        if not task:
            raise HTTPException(404, "Task not found")
        if payload.kind == "work":
            task.pomodoro_count += 1
    db.add(PomodoroSession(**payload.model_dump()))
    db.commit()
    return {"ok": True}


@router.get("/stats")
def stats(db: Session = Depends(get_db)):
    now = datetime.now()
    today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
    week_start = today_start - timedelta(days=today_start.weekday())

    def agg(since):
        row = db.execute(
            select(func.count(), func.coalesce(func.sum(PomodoroSession.minutes), 0))
            .where(PomodoroSession.kind == "work", PomodoroSession.ended_at >= since)
        ).one()
        return {"sessions": row[0], "minutes": row[1]}

    return {"today": agg(today_start), "week": agg(week_start)}
