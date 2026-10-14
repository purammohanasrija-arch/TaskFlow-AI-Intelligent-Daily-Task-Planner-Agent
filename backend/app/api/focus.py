from datetime import datetime, timezone
from typing import List, Optional
from fastapi import APIRouter, HTTPException, Depends
from bson import ObjectId
from app.core.database import get_focus_sessions_collection, get_tasks_collection
from app.models.focus import FocusSessionInDB, FocusSessionStatus
from app.models.task import TaskStatus
from app.models.user import UserInDB
from app.schemas.focus import FocusStartRequest, FocusFinishRequest, FocusSessionResponse
from app.api.deps import get_current_user

router = APIRouter(prefix="/focus", tags=["Focus"])


def focus_doc_to_response(doc: dict) -> FocusSessionResponse:
    doc["id"] = str(doc["_id"])
    return FocusSessionResponse(**doc)


@router.post("/start", response_model=FocusSessionResponse)
async def start_focus(req: FocusStartRequest, current_user: UserInDB = Depends(get_current_user)):
    focus_col = get_focus_sessions_collection()
    tasks_col = get_tasks_collection()

    title = req.task_title or "Focus Session"
    if req.task_id:
        query = {"_id": ObjectId(req.task_id)} if ObjectId.is_valid(req.task_id) else {"_id": req.task_id}
        task = await tasks_col.find_one(query)
        if task:
            title = task["title"]
            # Set task status to in_progress if currently pending
            if task.get("status") == TaskStatus.PENDING:
                await tasks_col.update_one(query, {"$set": {"status": TaskStatus.IN_PROGRESS}})

    now = datetime.now(timezone.utc)
    session = FocusSessionInDB(
        user_id=str(current_user.id),
        task_id=req.task_id,
        task_title=title,
        planned_duration=req.planned_duration,
        actual_duration=0,
        started_at=now,
        status=FocusSessionStatus.RUNNING
    )

    doc = session.model_dump(by_alias=True, exclude={"id"})
    res = await focus_col.insert_one(doc)
    doc["_id"] = res.inserted_id
    return focus_doc_to_response(doc)


@router.post("/finish", response_model=FocusSessionResponse)
async def finish_focus(req: FocusFinishRequest, current_user: UserInDB = Depends(get_current_user)):
    focus_col = get_focus_sessions_collection()
    tasks_col = get_tasks_collection()
    now = datetime.now(timezone.utc)

    query = {"_id": ObjectId(req.session_id), "user_id": str(current_user.id)} if ObjectId.is_valid(req.session_id) else {"_id": req.session_id, "user_id": str(current_user.id)}
    session = await focus_col.find_one(query)
    if not session:
        raise HTTPException(status_code=404, detail="Focus session not found")

    update_fields = {
        "actual_duration": req.actual_duration,
        "ended_at": now,
        "status": req.status,
        "notes": req.notes or ""
    }
    await focus_col.update_one(query, {"$set": update_fields})

    # If linked to a task, increment actual_duration on the task
    task_id = session.get("task_id")
    if task_id:
        t_query = {"_id": ObjectId(task_id)} if ObjectId.is_valid(task_id) else {"_id": task_id}
        task = await tasks_col.find_one(t_query)
        if task:
            new_dur = (task.get("actual_duration") or 0) + req.actual_duration
            t_update = {"actual_duration": new_dur}
            if req.mark_task_completed:
                t_update["status"] = TaskStatus.COMPLETED
                t_update["completed_at"] = now
            await tasks_col.update_one(t_query, {"$set": t_update})

    updated = await focus_col.find_one(query)
    return focus_doc_to_response(updated)


@router.get("/history", response_model=List[FocusSessionResponse])
async def get_focus_history(current_user: UserInDB = Depends(get_current_user)):
    focus_col = get_focus_sessions_collection()
    cursor = focus_col.find({"user_id": str(current_user.id)}).sort("started_at", -1)
    docs = await cursor.to_list(length=100)
    return [focus_doc_to_response(d) for d in docs]
