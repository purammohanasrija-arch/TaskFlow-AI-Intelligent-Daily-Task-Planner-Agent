from datetime import datetime
from typing import Optional
from pydantic import BaseModel
from app.models.focus import FocusSessionStatus


class FocusStartRequest(BaseModel):
    task_id: Optional[str] = None
    task_title: Optional[str] = "Focus Session"
    planned_duration: int = 25  # minutes


class FocusFinishRequest(BaseModel):
    session_id: str
    actual_duration: int  # minutes
    status: FocusSessionStatus = FocusSessionStatus.COMPLETED
    notes: Optional[str] = ""
    mark_task_completed: bool = False


class FocusSessionResponse(BaseModel):
    id: str
    user_id: str
    task_id: Optional[str] = None
    task_title: str
    planned_duration: int
    actual_duration: int
    started_at: datetime
    ended_at: Optional[datetime] = None
    status: FocusSessionStatus
    notes: Optional[str] = ""
