from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel, Field
from app.models.task import PriorityLevel, TaskStatus, RecurrenceRule, SubTask


class SubTaskCreate(BaseModel):
    title: str
    estimated_duration: int = 15
    completion_criteria: Optional[str] = None


class TaskCreate(BaseModel):
    title: str
    description: Optional[str] = ""
    category: str = "general"
    priority: PriorityLevel = PriorityLevel.MEDIUM
    due_date: Optional[datetime] = None
    estimated_duration: int = 30
    preferred_time: Optional[str] = None
    dependencies: List[str] = Field(default_factory=list)
    subtasks: List[SubTaskCreate] = Field(default_factory=list)
    recurrence: RecurrenceRule = RecurrenceRule.NONE
    goal_id: Optional[str] = None
    energy_level: str = "medium"
    importance: int = 3
    urgency: int = 3


class TaskUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    category: Optional[str] = None
    priority: Optional[PriorityLevel] = None
    status: Optional[TaskStatus] = None
    due_date: Optional[datetime] = None
    estimated_duration: Optional[int] = None
    actual_duration: Optional[int] = None
    preferred_time: Optional[str] = None
    scheduled_start: Optional[datetime] = None
    scheduled_end: Optional[datetime] = None
    dependencies: Optional[List[str]] = None
    subtasks: Optional[List[SubTask]] = None
    recurrence: Optional[RecurrenceRule] = None
    energy_level: Optional[str] = None
    importance: Optional[int] = None
    urgency: Optional[int] = None
    priority_score: Optional[float] = None
    priority_bucket: Optional[str] = None


class TaskResponse(BaseModel):
    id: str
    user_id: str
    title: str
    description: Optional[str] = ""
    category: str
    priority: PriorityLevel
    status: TaskStatus
    due_date: Optional[datetime] = None
    estimated_duration: int
    actual_duration: int
    preferred_time: Optional[str] = None
    scheduled_start: Optional[datetime] = None
    scheduled_end: Optional[datetime] = None
    dependencies: List[str]
    subtasks: List[SubTask]
    recurrence: RecurrenceRule
    goal_id: Optional[str] = None
    energy_level: str
    importance: int
    urgency: int
    priority_score: float
    priority_bucket: str
    completed_at: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime


class NaturalLanguageTaskRequest(BaseModel):
    prompt: str  # e.g. "Complete DBMS notes for two hours tomorrow at 3 PM"
    timezone: Optional[str] = "UTC"


class NaturalLanguageTaskParsed(BaseModel):
    title: str
    description: Optional[str] = ""
    category: str = "general"
    priority: PriorityLevel = PriorityLevel.MEDIUM
    estimated_duration: int = 45
    due_date: Optional[datetime] = None
    preferred_time: Optional[str] = None
    energy_level: str = "medium"
    recurrence: RecurrenceRule = RecurrenceRule.NONE
    confidence: float = 0.95
    clarification_needed: Optional[str] = None
