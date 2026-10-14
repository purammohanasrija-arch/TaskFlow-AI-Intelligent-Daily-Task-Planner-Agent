from datetime import datetime, date, timezone
from typing import List, Optional
from fastapi import APIRouter, Depends, Query
from app.core.database import get_daily_reviews_collection, get_tasks_collection, get_focus_sessions_collection
from app.models.task import TaskInDB
from app.models.focus import FocusSessionInDB
from app.models.review import DailyReviewInDB
from app.models.user import UserInDB
from app.agents.review_agent import ReviewAndInsightsAgent
from app.api.deps import get_current_user

router = APIRouter(prefix="/reviews", tags=["Daily Reviews"])


def review_doc_to_response(doc: dict) -> dict:
    doc["id"] = str(doc["_id"])
    return doc


@router.post("/daily")
async def create_daily_review(
    review_date: Optional[str] = Query(None),
    current_user: UserInDB = Depends(get_current_user)
):
    target_date = date.fromisoformat(review_date) if review_date else datetime.now(timezone.utc).date()
    date_str = target_date.isoformat()

    tasks_col = get_tasks_collection()
    focus_col = get_focus_sessions_collection()
    reviews_col = get_daily_reviews_collection()

    tasks_cursor = tasks_col.find({"user_id": str(current_user.id)})
    tasks = [TaskInDB(**d) for d in await tasks_cursor.to_list(200)]

    focus_cursor = focus_col.find({"user_id": str(current_user.id)})
    focus_sessions = [FocusSessionInDB(**d) for d in await focus_cursor.to_list(100)]

    review_obj = await ReviewAndInsightsAgent.generate_daily_review(
        user=current_user,
        review_date=target_date,
        tasks=tasks,
        focus_sessions=focus_sessions,
        user_api_key=current_user.preferences.api_key_override
    )

    doc = review_obj.model_dump(by_alias=True, exclude={"id"})
    
    # Upsert daily review
    await reviews_col.update_one(
        {"user_id": str(current_user.id), "review_date": date_str},
        {"$set": doc},
        upsert=True
    )

    saved = await reviews_col.find_one({"user_id": str(current_user.id), "review_date": date_str})
    return review_doc_to_response(saved)


@router.get("/history")
async def get_reviews_history(current_user: UserInDB = Depends(get_current_user)):
    reviews_col = get_daily_reviews_collection()
    cursor = reviews_col.find({"user_id": str(current_user.id)}).sort("review_date", -1)
    docs = await cursor.to_list(30)
    return [review_doc_to_response(d) for d in docs]


@router.get("/today")
async def get_today_review(current_user: UserInDB = Depends(get_current_user)):
    target_date = datetime.now(timezone.utc).date()
    date_str = target_date.isoformat()
    reviews_col = get_daily_reviews_collection()
    doc = await reviews_col.find_one({"user_id": str(current_user.id), "review_date": date_str})
    if doc:
        return review_doc_to_response(doc)
    return await create_daily_review(date_str, current_user)
