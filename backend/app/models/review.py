from datetime import datetime, timezone
from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field


from app.models.common import PyObjectId


class DailyReviewInDB(BaseModel):
    id: Optional[PyObjectId] = Field(default=None, alias="_id")
    user_id: str
    review_date: str  # YYYY-MM-DD
    tasks_completed: int = 0
    tasks_remaining: int = 0
    planned_minutes: int = 0
    actual_minutes: int = 0
    focus_minutes: int = 0
    productivity_score: int = 0
    achievements: List[str] = Field(default_factory=list)
    missed_deadlines: List[str] = Field(default_factory=list)
    insights: List[str] = Field(default_factory=list)
    improvements_for_tomorrow: List[str] = Field(default_factory=list)
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

    class Config:
        populate_by_name = True
        json_encoders = {datetime: lambda v: v.isoformat()}
