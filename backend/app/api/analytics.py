from datetime import datetime, timezone
from fastapi import APIRouter, Depends
from app.core.database import get_tasks_collection, get_focus_sessions_collection
from app.models.task import TaskInDB
from app.models.focus import FocusSessionInDB
from app.models.user import UserInDB
from app.schemas.analytics import AnalyticsSummaryResponse
from app.services.analytics_service import AnalyticsService
from app.api.deps import get_current_user

router = APIRouter(prefix="/analytics", tags=["Analytics"])


@router.get("/summary", response_model=AnalyticsSummaryResponse)
async def get_analytics_summary(current_user: UserInDB = Depends(get_current_user)):
    tasks_col = get_tasks_collection()
    focus_col = get_focus_sessions_collection()

    tasks_cursor = tasks_col.find({"user_id": str(current_user.id)})
    tasks = [TaskInDB(**d) for d in await tasks_cursor.to_list(length=300)]

    focus_cursor = focus_col.find({"user_id": str(current_user.id)})
    focus_sessions = [FocusSessionInDB(**d) for d in await focus_cursor.to_list(length=300)]

    return AnalyticsService.compute_summary(
        tasks=tasks,
        focus_sessions=focus_sessions,
        now=datetime.now(timezone.utc)
    )
