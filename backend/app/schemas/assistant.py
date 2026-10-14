from datetime import datetime
from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field
from app.schemas.task import TaskCreate, SubTaskCreate


class ChatMessage(BaseModel):
    role: str  # "user", "assistant", "system"
    content: str
    timestamp: Optional[datetime] = None


class ProposedAction(BaseModel):
    action_type: str  # "create_task", "replan_day", "breakdown_task", "update_task", "reschedule_task"
    description: str
    payload: Dict[str, Any]
    requires_confirmation: bool = True


class ChatRequest(BaseModel):
    message: str
    history: List[ChatMessage] = Field(default_factory=list)
    current_time: Optional[datetime] = None


class ChatResponse(BaseModel):
    reply: str
    proposed_actions: List[ProposedAction] = Field(default_factory=list)
    quick_suggestions: List[str] = Field(default_factory=list)
    agent_used: str = "Central Orchestrator"


class GoalBreakdownRequest(BaseModel):
    goal_title: str
    goal_description: Optional[str] = ""
    target_days: Optional[int] = 7
    category: Optional[str] = "study"


class SubtaskSuggestion(BaseModel):
    title: str
    estimated_duration: int  # minutes
    order: int
    completion_criteria: str
    recommended_day_offset: int = 0
    dependencies: List[str] = Field(default_factory=list)


class GoalBreakdownResponse(BaseModel):
    goal_title: str
    overview: str
    suggested_subtasks: List[SubtaskSuggestion]
    total_estimated_hours: float
