from datetime import date, datetime

from pydantic import BaseModel, ConfigDict, Field


class TaskCreate(BaseModel):
    title: str = Field(min_length=1, max_length=300)
    description: str = ""
    status: str = "todo"
    list_type: str = "work"
    priority: str = "medium"
    due_date: date | None = None


class TaskUpdate(BaseModel):
    title: str | None = Field(default=None, min_length=1, max_length=300)
    description: str | None = None
    status: str | None = None
    priority: str | None = None
    due_date: date | None = None
    clear_due_date: bool = False
    sort_order: float | None = None


class EventCreate(BaseModel):
    title: str = Field(min_length=1, max_length=300)
    description: str = ""
    start_at: datetime
    end_at: datetime
    all_day: bool = False


class EventUpdate(BaseModel):
    title: str | None = Field(default=None, min_length=1, max_length=300)
    description: str | None = None
    start_at: datetime | None = None
    end_at: datetime | None = None
    all_day: bool | None = None


class EventOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    title: str
    description: str
    start_at: datetime
    end_at: datetime
    all_day: bool
    google_event_id: str | None


class FolderCreate(BaseModel):
    name: str = Field(min_length=1, max_length=120)
    parent_id: int | None = None


class FolderOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    parent_id: int | None


class NoteCreate(BaseModel):
    title: str = "Untitled"
    content: str = ""
    folder_id: int | None = None
    tags: list[str] = []


class NoteUpdate(BaseModel):
    title: str | None = None
    content: str | None = None
    folder_id: int | None = None
    clear_folder: bool = False
    tags: list[str] | None = None


class NoteOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    title: str
    content: str
    folder_id: int | None
    tags: list[str]
    created_at: datetime
    updated_at: datetime


class TaskOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    title: str
    description: str
    status: str
    list_type: str
    priority: str
    due_date: date | None
    sort_order: float
    pomodoro_count: int
    created_at: datetime
    completed_at: datetime | None
