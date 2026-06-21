from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from ..database import get_db
from ..models import TASK_LIST_TYPES, TASK_PRIORITIES, TASK_STATUSES, Task
from ..schemas import TaskCreate, TaskOut, TaskUpdate

router = APIRouter(prefix="/api/tasks", tags=["tasks"])


def _get_task(db: Session, task_id: int) -> Task:
    task = db.get(Task, task_id)
    if not task:
        raise HTTPException(404, "Task not found")
    return task


def _validate(
    status: str | None,
    priority: str | None,
    list_type: str | None = None,
):
    if status is not None and status not in TASK_STATUSES:
        raise HTTPException(422, f"status must be one of {TASK_STATUSES}")
    if priority is not None and priority not in TASK_PRIORITIES:
        raise HTTPException(422, f"priority must be one of {TASK_PRIORITIES}")
    if list_type is not None and list_type not in TASK_LIST_TYPES:
        raise HTTPException(422, f"list_type must be one of {TASK_LIST_TYPES}")


@router.get("", response_model=list[TaskOut])
def list_tasks(
    list_type: str = Query(...),
    db: Session = Depends(get_db),
):
    _validate(None, None, list_type)
    return db.scalars(
        select(Task)
        .where(Task.list_type == list_type)
        .order_by(Task.sort_order, Task.id)
    ).all()


@router.post("", response_model=TaskOut, status_code=201)
def create_task(payload: TaskCreate, db: Session = Depends(get_db)):
    _validate(payload.status, payload.priority, payload.list_type)
    max_order = db.scalar(
        select(func.coalesce(func.max(Task.sort_order), 0.0)).where(
            Task.status == payload.status,
            Task.list_type == payload.list_type,
        )
    )
    task = Task(**payload.model_dump(), sort_order=max_order + 1.0)
    if task.status == "done":
        task.completed_at = datetime.utcnow()
    db.add(task)
    db.commit()
    db.refresh(task)
    return task


@router.put("/{task_id}", response_model=TaskOut)
def update_task(task_id: int, payload: TaskUpdate, db: Session = Depends(get_db)):
    task = _get_task(db, task_id)
    _validate(payload.status, payload.priority)

    data = payload.model_dump(exclude_unset=True, exclude={"clear_due_date"})
    if payload.clear_due_date:
        data["due_date"] = None

    new_status = data.get("status")
    if new_status and new_status != task.status:
        task.completed_at = datetime.utcnow() if new_status == "done" else None
        if "sort_order" not in data:
            max_order = db.scalar(
                select(func.coalesce(func.max(Task.sort_order), 0.0)).where(
                    Task.status == new_status,
                    Task.list_type == task.list_type,
                )
            )
            data["sort_order"] = max_order + 1.0

    for key, value in data.items():
        setattr(task, key, value)
    db.commit()
    db.refresh(task)
    return task


@router.delete("/{task_id}", status_code=204)
def delete_task(task_id: int, db: Session = Depends(get_db)):
    db.delete(_get_task(db, task_id))
    db.commit()
