from datetime import datetime, timezone
from typing import List, Optional
from pydantic import BaseModel, Field
from enum import Enum


class PriorityLevel(str, Enum):
    CRITICAL = "critical"
    HIGH = "high"
    MEDIUM = "medium"
    LOW = "low"


class TaskStatus(str, Enum):
    PENDING = "pending"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
    CANCELLED = "cancelled"


class RecurrenceRule(str, Enum):
    NONE = "none"
    DAILY = "daily"
    WEEKDAYS = "weekdays"
    WEEKLY = "weekly"
    MONTHLY = "monthly"


class SubTask(BaseModel):
    id: str
    title: str
    estimated_duration: int = 15  # in minutes
    completed: bool = False
    order: int = 0
    completion_criteria: Optional[str] = None


from app.models.common import PyObjectId


class TaskInDB(BaseModel):
    id: Optional[PyObjectId] = Field(default=None, alias="_id")
    user_id: str
    title: str
    description: Optional[str] = ""
    category: str = "general"  # study, work, personal, coding, health, errand
    priority: PriorityLevel = PriorityLevel.MEDIUM
    status: TaskStatus = TaskStatus.PENDING
    
    # Timing and planning
    due_date: Optional[datetime] = None  # in UTC
    estimated_duration: int = 30         # minutes
    actual_duration: int = 0             # minutes tracked via focus sessions or manual
    preferred_time: Optional[str] = None # "morning", "afternoon", "evening", or "14:00"
    scheduled_start: Optional[datetime] = None
    scheduled_end: Optional[datetime] = None
    
    # Dependencies & decomposition
    dependencies: List[str] = Field(default_factory=list)  # list of task_ids
    subtasks: List[SubTask] = Field(default_factory=list)
    recurrence: RecurrenceRule = RecurrenceRule.NONE
    goal_id: Optional[str] = None
    
    # Priority engine attributes
    importance: int = 3   # 1-5
    urgency: int = 3      # 1-5
    energy_level: str = "medium"  # high, medium, low
    priority_score: float = 50.0  # calculated deterministic priority score 0-100
    priority_bucket: str = "important_not_urgent"  # critical_urgent, important_not_urgent, quick_win, routine, optional
    
    completed_at: Optional[datetime] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

    model_config = {
        "populate_by_name": True
    }
