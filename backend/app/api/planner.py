from datetime import datetime, date, timezone
from typing import List, Optional
from fastapi import APIRouter, HTTPException, Depends, Query
from bson import ObjectId
from app.core.database import get_schedule_blocks_collection, get_tasks_collection
from app.models.schedule import ScheduleBlockInDB, BlockType, PlanningMode, BlockStatus
from app.models.task import TaskInDB
from app.models.user import UserInDB
from app.schemas.planner import (
    PlanGenerateRequest, PlanResponse, ScheduleBlockResponse,
    ScheduleBlockUpdate, ReplanRequest, ReplanResponse
)
from app.services.scheduling_engine import SchedulingEngine
from app.services.replanning_engine import ReplanningEngine
from app.api.deps import get_current_user

router = APIRouter(prefix="/planner", tags=["Planner"])


def block_doc_to_response(doc: dict) -> ScheduleBlockResponse:
    doc["id"] = str(doc["_id"])
    return ScheduleBlockResponse(**doc)


@router.get("/today", response_model=PlanResponse)
async def get_today_plan(
    plan_date: Optional[str] = Query(None),
    current_user: UserInDB = Depends(get_current_user)
):
    target_date = date.fromisoformat(plan_date) if plan_date else datetime.now(timezone.utc).date()
    date_str = target_date.isoformat()

    blocks_col = get_schedule_blocks_collection()
    cursor = blocks_col.find({"user_id": str(current_user.id), "plan_date": date_str}).sort("start_time", 1)
    existing_blocks = await cursor.to_list(100)

    if existing_blocks:
        responses = [block_doc_to_response(b) for b in existing_blocks]
        task_minutes = sum(int((b.end_time - b.start_time).total_seconds() / 60) for b in responses if b.block_type == BlockType.TASK)
        break_minutes = sum(int((b.end_time - b.start_time).total_seconds() / 60) for b in responses if b.block_type == BlockType.BREAK)
        mode = responses[0].planning_mode if responses else PlanningMode.BALANCED
        
        return PlanResponse(
            plan_date=date_str,
            planning_mode=mode,
            total_scheduled_minutes=task_minutes,
            total_break_minutes=break_minutes,
            available_minutes=480,
            blocks=responses,
            unscheduled_tasks=[],
            conflicts_detected=[],
            ai_rationale=f"Active schedule for {target_date.strftime('%A, %b %d')} with {len(responses)} total time blocks.",
            plan_version=responses[0].plan_version if responses else 1
        )

    # If no plan exists, generate one automatically
    return await generate_plan(PlanGenerateRequest(plan_date=date_str), current_user)


@router.post("/generate", response_model=PlanResponse)
async def generate_plan(
    req: PlanGenerateRequest,
    current_user: UserInDB = Depends(get_current_user)
):
    target_date = date.fromisoformat(req.plan_date) if req.plan_date else datetime.now(timezone.utc).date()
    date_str = target_date.isoformat()
    mode = req.mode or PlanningMode(current_user.preferences.planning_mode or "balanced")

    tasks_col = get_tasks_collection()
    blocks_col = get_schedule_blocks_collection()

    tasks_cursor = tasks_col.find({"user_id": str(current_user.id)})
    tasks = [TaskInDB(**d) for d in await tasks_cursor.to_list(200)]

    blocks, unscheduled, conflicts, rationale = SchedulingEngine.generate_schedule(
        user=current_user,
        tasks=tasks,
        plan_date=target_date,
        mode=mode,
        buffer_minutes=req.buffer_minutes or 10,
        include_breaks=req.include_breaks if req.include_breaks is not None else True
    )

    # Delete previous non-fixed plan for this date
    await blocks_col.delete_many({
        "user_id": str(current_user.id),
        "plan_date": date_str,
        "is_fixed": False
    })

    # Save newly generated blocks
    saved_blocks: List[ScheduleBlockResponse] = []
    for b in blocks:
        d = b.model_dump(by_alias=True, exclude={"id"})
        res = await blocks_col.insert_one(d)
        d["_id"] = res.inserted_id
        saved_blocks.append(block_doc_to_response(d))

    task_minutes = sum(int((b.end_time - b.start_time).total_seconds() / 60) for b in saved_blocks if b.block_type == BlockType.TASK)
    break_minutes = sum(int((b.end_time - b.start_time).total_seconds() / 60) for b in saved_blocks if b.block_type == BlockType.BREAK)

    return PlanResponse(
        plan_date=date_str,
        planning_mode=mode,
        total_scheduled_minutes=task_minutes,
        total_break_minutes=break_minutes,
        available_minutes=480,
        blocks=saved_blocks,
        unscheduled_tasks=unscheduled,
        conflicts_detected=conflicts,
        ai_rationale=rationale,
        plan_version=1
    )


@router.post("/replan", response_model=ReplanResponse)
async def replan_schedule(
    req: ReplanRequest,
    current_user: UserInDB = Depends(get_current_user)
):
    target_date = date.fromisoformat(req.plan_date) if req.plan_date else datetime.now(timezone.utc).date()
    date_str = target_date.isoformat()
    now = req.current_time or datetime.now(timezone.utc)

    blocks_col = get_schedule_blocks_collection()
    tasks_col = get_tasks_collection()

    existing_blocks_cursor = blocks_col.find({"user_id": str(current_user.id), "plan_date": date_str})
    current_blocks = [ScheduleBlockInDB(**b) for b in await existing_blocks_cursor.to_list(100)]

    tasks_cursor = tasks_col.find({"user_id": str(current_user.id)})
    tasks = [TaskInDB(**d) for d in await tasks_cursor.to_list(200)]

    new_blocks, changes, ai_explanation = ReplanningEngine.replan_day(
        user=current_user,
        current_blocks=current_blocks,
        tasks=tasks,
        current_time=now,
        reason=req.reason or "Midday adjustment"
    )

    # Persist updated blocks
    await blocks_col.delete_many({"user_id": str(current_user.id), "plan_date": date_str})
    saved_blocks: List[ScheduleBlockResponse] = []
    
    for b in new_blocks:
        d = b.model_dump(by_alias=True, exclude={"id"})
        d["plan_version"] = (b.plan_version or 1) + 1
        res = await blocks_col.insert_one(d)
        d["_id"] = res.inserted_id
        saved_blocks.append(block_doc_to_response(d))

    preserved_count = sum(1 for b in saved_blocks if b.status == BlockStatus.COMPLETED or b.is_fixed)
    shifted_count = len(saved_blocks) - preserved_count

    return ReplanResponse(
        plan_date=date_str,
        replanned_blocks=saved_blocks,
        changes_summary=changes,
        ai_explanation=ai_explanation,
        preserved_blocks_count=preserved_count,
        shifted_tasks_count=shifted_count
    )


@router.patch("/blocks/{block_id}", response_model=ScheduleBlockResponse)
async def update_schedule_block(
    block_id: str,
    update: ScheduleBlockUpdate,
    current_user: UserInDB = Depends(get_current_user)
):
    blocks_col = get_schedule_blocks_collection()
    query = {"_id": ObjectId(block_id), "user_id": str(current_user.id)} if ObjectId.is_valid(block_id) else {"_id": block_id, "user_id": str(current_user.id)}
    
    existing = await blocks_col.find_one(query)
    if not existing:
        raise HTTPException(status_code=404, detail="Schedule block not found")

    update_dict = {k: v for k, v in update.model_dump().items() if v is not None}
    update_dict["updated_at"] = datetime.now(timezone.utc)

    await blocks_col.update_one(query, {"$set": update_dict})
    updated = await blocks_col.find_one(query)
    return block_doc_to_response(updated)


@router.delete("/blocks/{block_id}")
async def delete_schedule_block(
    block_id: str,
    current_user: UserInDB = Depends(get_current_user)
):
    blocks_col = get_schedule_blocks_collection()
    query = {"_id": ObjectId(block_id), "user_id": str(current_user.id)} if ObjectId.is_valid(block_id) else {"_id": block_id, "user_id": str(current_user.id)}
    res = await blocks_col.delete_one(query)
    if res.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Block not found")
    return {"message": "Block removed from plan"}
