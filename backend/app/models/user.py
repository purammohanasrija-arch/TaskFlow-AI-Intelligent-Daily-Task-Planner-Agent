from datetime import datetime, timezone
from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field, EmailStr


class FixedCommitment(BaseModel):
    title: str
    start_time: str  # e.g. "12:30" (24h)
    end_time: str    # e.g. "13:30" (24h)
    days: List[int] = Field(default_factory=lambda: [0, 1, 2, 3, 4, 5, 6])  # 0=Monday, 6=Sunday


class WorkingHours(BaseModel):
    start_time: str = "09:00"
    end_time: str = "18:00"
    work_days: List[int] = Field(default_factory=lambda: [0, 1, 2, 3, 4])  # Mon-Fri
    fixed_commitments: List[FixedCommitment] = Field(default_factory=list)


class UserPreferences(BaseModel):
    role: str = "student"  # student, professional, individual, developer
    planning_style: str = "structured"  # structured, flexible, deep_work
    planning_mode: str = "balanced"  # balanced, focus, deadline
    default_task_duration: int = 45  # minutes
    preferred_break_duration: int = 15  # minutes
    focus_duration: int = 25  # pomodoro focus in minutes
    short_break_duration: int = 5  # pomodoro break in minutes
    long_break_duration: int = 15
    theme: str = "light"  # light, dark, system
    enable_ai_suggestions: bool = True
    ai_provider: Optional[str] = "gemini"
    api_key_override: Optional[str] = None


class NotificationSettings(BaseModel):
    in_app: bool = True
    browser_notifications: bool = True
    deadline_reminders: bool = True
    schedule_reminders: bool = True
    daily_review_reminder: bool = True
    reminder_minutes_before: int = 10
    quiet_hours_enabled: bool = False
    quiet_hours_start: str = "22:00"
    quiet_hours_end: str = "07:00"


from app.models.common import PyObjectId


class UserInDB(BaseModel):
    id: Optional[PyObjectId] = Field(default=None, alias="_id")
    email: EmailStr
    name: str
    password_hash: str
    timezone: str = "UTC"
    preferences: UserPreferences = Field(default_factory=UserPreferences)
    working_hours: WorkingHours = Field(default_factory=WorkingHours)
    notification_settings: NotificationSettings = Field(default_factory=NotificationSettings)
    onboarding_completed: bool = False
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

    model_config = {
        "populate_by_name": True
    }
