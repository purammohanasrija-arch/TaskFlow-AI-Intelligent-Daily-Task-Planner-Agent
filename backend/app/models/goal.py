from datetime import datetime, timezone
from typing import List, Optional
from pydantic import BaseModel, Field


class GoalInDB(BaseModel):
    id: Optional[str] = Field(default=None, alias="_id")
    user_id: str
    title: str
    description: Optional[str] = ""
    target_date: Optional[datetime] = None
    progress: int = 0  # 0 to 100 percentage
    linked_task_ids: List[str] = Field(default_factory=list)
    status: str = "active"  # active, completed, archived
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

    class Config:
        populate_by_name = True
        json_encoders = {datetime: lambda v: v.isoformat()}
