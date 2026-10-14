from typing import List, Dict, Any, Optional
from pydantic import BaseModel


class CategoryStat(BaseModel):
    category: str
    completed_count: int
    total_count: int
    total_minutes: int


class DailyCompletionTrend(BaseModel):
    date: str
    completed: int
    pending: int
    focus_minutes: int


class AnalyticsSummaryResponse(BaseModel):
    total_tasks: int
    completed_tasks: int
    pending_tasks: int
    overdue_tasks: int
    completion_rate: float
    total_focus_minutes: float
    productivity_score: int
    score_breakdown: Dict[str, Any]
    category_distribution: List[CategoryStat]
    daily_trends: List[DailyCompletionTrend]
    planned_vs_actual_minutes: Dict[str, int]
    daily_recommendation: str
