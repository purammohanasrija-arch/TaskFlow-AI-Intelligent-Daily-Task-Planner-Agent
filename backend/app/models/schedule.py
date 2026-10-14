from datetime import datetime, timezone
from typing import Optional
from pydantic import BaseModel, Field
from enum import Enum


class BlockType(str, Enum):
    TASK = "task"
    BREAK = "break"
    COMMITMENT = "commitment"
    BUFFER = "buffer"


class PlanningMode(str, Enum):
    BALANCED = "balanced"
    FOCUS = "focus"
    DEADLINE = "deadline"


class BlockStatus(str, Enum):
    SCHEDULED = "scheduled"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
    SKIPPED = "skipped"


from app.models.common import PyObjectId


class ScheduleBlockInDB(BaseModel):
    id: Optional[PyObjectId] = Field(default=None, alias="_id")
    user_id: str
    task_id: Optional[str] = None
    title: str
    start_time: datetime
    end_time: datetime
    block_type: BlockType = BlockType.TASK
    status: BlockStatus = BlockStatus.SCHEDULED
    planning_mode: PlanningMode = PlanningMode.BALANCED
    plan_date: str  # YYYY-MM-DD
    plan_version: int = 1
    rationale: Optional[str] = ""
    is_fixed: bool = False  # e.g. fixed meetings or lunch commitments
    category: Optional[str] = "general"
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

    model_config = {
        "populate_by_name": True
    }
