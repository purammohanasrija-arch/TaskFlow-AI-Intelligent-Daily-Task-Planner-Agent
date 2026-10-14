from datetime import datetime, timezone
from typing import Optional
from pydantic import BaseModel, Field
from enum import Enum


class FocusSessionStatus(str, Enum):
    RUNNING = "running"
    COMPLETED = "completed"
    INTERRUPTED = "interrupted"


from app.models.common import PyObjectId


class FocusSessionInDB(BaseModel):
    id: Optional[PyObjectId] = Field(default=None, alias="_id")
    user_id: str
    task_id: Optional[str] = None
    task_title: Optional[str] = "Focus Session"
    planned_duration: int = 25  # minutes
    actual_duration: int = 0    # minutes recorded
    started_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    ended_at: Optional[datetime] = None
    status: FocusSessionStatus = FocusSessionStatus.COMPLETED
    notes: Optional[str] = ""

    class Config:
        populate_by_name = True
        json_encoders = {datetime: lambda v: v.isoformat()}
