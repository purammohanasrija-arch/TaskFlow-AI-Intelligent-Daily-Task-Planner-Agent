from datetime import datetime, timezone
from typing import Optional, Any
from pydantic import BaseModel, Field


class AgentMemoryInDB(BaseModel):
    id: Optional[str] = Field(default=None, alias="_id")
    user_id: str
    memory_type: str  # learned_duration, preferred_slot, frequently_postponed, category_speed
    preference_key: str
    preference_value: Any
    confidence: float = 0.5  # 0.0 to 1.0
    sample_count: int = 1
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

    class Config:
        populate_by_name = True
        json_encoders = {datetime: lambda v: v.isoformat()}
