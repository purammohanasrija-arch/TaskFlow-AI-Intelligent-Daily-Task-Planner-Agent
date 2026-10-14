from datetime import datetime, timezone
from typing import List, Dict, Any
from fastapi import APIRouter, Depends, Query
from app.core.database import get_schedule_blocks_collection, get_tasks_collection
from app.models.user import UserInDB
from app.api.deps import get_current_user

router = APIRouter(prefix="/calendar", tags=["Calendar"])


@router.get("")
async def get_calendar_events(
    start_date: str = Query(..., description="ISO date or YYYY-MM-DD"),
    end_date: str = Query(..., description="ISO date or YYYY-MM-DD"),
    current_user: UserInDB = Depends(get_current_user)
):
    blocks_col = get_schedule_blocks_collection()
    tasks_col = get_tasks_collection()

    # Query schedule blocks
    blocks_cursor = blocks_col.find({
        "user_id": str(current_user.id),
        "plan_date": {"$gte": start_date[:10], "$lte": end_date[:10]}
    }).sort("start_time", 1)
    blocks = await blocks_cursor.to_list(200)

    # Query tasks with due dates in this range
    tasks_cursor = tasks_col.find({
        "user_id": str(current_user.id),
        "due_date": {"$ne": None}
    })
    tasks = await tasks_cursor.to_list(200)

    events: List[Dict[str, Any]] = []

    # Map schedule blocks
    for b in blocks:
        events.append({
            "id": f"block_{str(b['_id'])}",
            "type": "block",
            "title": b.get("title"),
            "start": b.get("start_time").isoformat() if hasattr(b.get("start_time"), "isoformat") else b.get("start_time"),
            "end": b.get("end_time").isoformat() if hasattr(b.get("end_time"), "isoformat") else b.get("end_time"),
            "block_type": b.get("block_type", "task"),
            "status": b.get("status", "scheduled"),
            "category": b.get("category", "general"),
            "is_fixed": b.get("is_fixed", False),
            "rationale": b.get("rationale", "")
        })

    # Map task deadlines
    for t in tasks:
        due = t.get("due_date")
        if due:
            due_str = due.isoformat() if hasattr(due, "isoformat") else str(due)
            events.append({
                "id": f"task_{str(t['_id'])}",
                "type": "deadline",
                "title": f"Deadline: {t.get('title')}",
                "start": due_str,
                "end": due_str,
                "block_type": "deadline",
                "status": t.get("status", "pending"),
                "category": t.get("category", "general"),
                "priority": t.get("priority", "medium")
            })

    return events
