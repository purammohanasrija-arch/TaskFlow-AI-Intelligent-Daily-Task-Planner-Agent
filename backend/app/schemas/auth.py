from typing import Optional, List
from pydantic import BaseModel, EmailStr
from app.models.user import UserPreferences, WorkingHours, NotificationSettings


class UserRegister(BaseModel):
    name: str
    email: EmailStr
    password: str
    timezone: Optional[str] = "UTC"
    role: Optional[str] = "student"


class UserLogin(BaseModel):
    email: EmailStr
    password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: "UserResponse"


class UserResponse(BaseModel):
    id: str
    name: str
    email: EmailStr
    timezone: str
    role: str
    preferences: UserPreferences
    working_hours: WorkingHours
    notification_settings: NotificationSettings
    onboarding_completed: bool


class UserUpdate(BaseModel):
    name: Optional[str] = None
    timezone: Optional[str] = None
    role: Optional[str] = None
    preferences: Optional[UserPreferences] = None
    working_hours: Optional[WorkingHours] = None
    notification_settings: Optional[NotificationSettings] = None
    onboarding_completed: Optional[bool] = None


class PasswordChange(BaseModel):
    current_password: str
    new_password: str


TokenResponse.model_rebuild()
