from datetime import datetime, timezone
from fastapi import APIRouter, Depends
from app.core.database import get_tasks_collection, get_schedule_blocks_collection
from app.models.task import TaskInDB
from app.models.schedule import ScheduleBlockInDB
from app.models.user import UserInDB
from app.schemas.assistant import (
    ChatRequest, ChatResponse, GoalBreakdownRequest, GoalBreakdownResponse
)
from app.schemas.task import NaturalLanguageTaskRequest, NaturalLanguageTaskParsed
from app.agents.task_understanding_agent import TaskUnderstandingAgent
from app.agents.breakdown_agent import GoalBreakdownAgent
from app.agents.assistant_agent import ProductivityAssistantAgent
from app.api.deps import get_current_user

router = APIRouter(prefix="/assistant", tags=["AI Assistant"])


@router.post("/chat", response_model=ChatResponse)
async def chat_with_assistant(
    req: ChatRequest,
    current_user: UserInDB = Depends(get_current_user)
):
    tasks_col = get_tasks_collection()
    blocks_col = get_schedule_blocks_collection()

    tasks_cursor = tasks_col.find({"user_id": str(current_user.id)})
    tasks = [TaskInDB(**d) for d in await tasks_cursor.to_list(100)]

    blocks_cursor = blocks_col.find({"user_id": str(current_user.id)})
    blocks = [ScheduleBlockInDB(**d) for d in await blocks_cursor.to_list(50)]

    now = req.current_time or datetime.now(timezone.utc)
    api_key_override = current_user.preferences.api_key_override

    return await ProductivityAssistantAgent.chat(
        user=current_user,
        message=req.message,
        tasks=tasks,
        schedule_blocks=blocks,
        history=req.history,
        now=now,
        user_api_key=api_key_override
    )


@router.post("/parse-task", response_model=NaturalLanguageTaskParsed)
async def parse_task(
    req: NaturalLanguageTaskRequest,
    current_user: UserInDB = Depends(get_current_user)
):
    api_key_override = current_user.preferences.api_key_override
    return await TaskUnderstandingAgent.parse_natural_language_task(
        prompt=req.prompt,
        user_timezone=req.timezone or current_user.timezone or "UTC",
        now=datetime.now(timezone.utc),
        user_api_key=api_key_override
    )


@router.post("/breakdown-goal", response_model=GoalBreakdownResponse)
async def breakdown_goal(
    req: GoalBreakdownRequest,
    current_user: UserInDB = Depends(get_current_user)
):
    api_key_override = current_user.preferences.api_key_override
    return await GoalBreakdownAgent.breakdown_goal(
        goal_title=req.goal_title,
        goal_description=req.goal_description or "",
        target_days=req.target_days or 7,
        category=req.category or "study",
        user_api_key=api_key_override
    )
