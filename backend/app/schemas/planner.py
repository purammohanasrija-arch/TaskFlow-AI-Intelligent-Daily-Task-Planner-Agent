from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel, Field
from app.models.schedule import BlockType, PlanningMode, BlockStatus


class ScheduleBlockResponse(BaseModel):
    id: str
    user_id: str
    task_id: Optional[str] = None
    title: str
    start_time: datetime
    end_time: datetime
    block_type: BlockType
    status: BlockStatus
    planning_mode: PlanningMode
    plan_date: str
    plan_version: int
    rationale: Optional[str] = ""
    is_fixed: bool = False
    category: Optional[str] = "general"


class ScheduleBlockUpdate(BaseModel):
    start_time: Optional[datetime] = None
    end_time: Optional[datetime] = None
    status: Optional[BlockStatus] = None
    title: Optional[str] = None


class UnscheduledTaskInfo(BaseModel):
    task_id: str
    title: str
    estimated_duration: int
    priority: str
    reason: str  # e.g. "Workday limit exceeded (needed 60m, only 15m left)", "Missing dependency"
    recommendation: str  # e.g. "Postpone to tomorrow or split into smaller 20m sessions"


class PlanGenerateRequest(BaseModel):
    plan_date: Optional[str] = None  # YYYY-MM-DD, defaults to today
    mode: Optional[PlanningMode] = PlanningMode.BALANCED
    buffer_minutes: Optional[int] = 10
    include_breaks: Optional[bool] = True
    preserve_fixed: Optional[bool] = True


class PlanResponse(BaseModel):
    plan_date: str
    planning_mode: PlanningMode
    total_scheduled_minutes: int
    total_break_minutes: int
    available_minutes: int
    blocks: List[ScheduleBlockResponse]
    unscheduled_tasks: List[UnscheduledTaskInfo] = Field(default_factory=list)
    conflicts_detected: List[str] = Field(default_factory=list)
    ai_rationale: str
    plan_version: int


class ReplanRequest(BaseModel):
    plan_date: Optional[str] = None
    reason: Optional[str] = "Task delayed or priority changed"
    current_time: Optional[datetime] = None
    mode: Optional[PlanningMode] = None


class ReplanResponse(BaseModel):
    plan_date: str
    replanned_blocks: List[ScheduleBlockResponse]
    changes_summary: List[str]
    ai_explanation: str
    preserved_blocks_count: int
    shifted_tasks_count: int
