from datetime import datetime, timezone
from typing import Dict, Any
from fastapi import APIRouter, HTTPException, Depends
from bson import ObjectId
from app.core.database import (
    get_users_collection, get_tasks_collection,
    get_schedule_blocks_collection, get_focus_sessions_collection,
    get_daily_reviews_collection, get_agent_memories_collection
)
from app.models.user import UserInDB, UserPreferences, WorkingHours, NotificationSettings
from app.schemas.auth import UserResponse, UserUpdate
from app.api.deps import get_current_user

router = APIRouter(prefix="/settings", tags=["Settings"])


@router.get("", response_model=UserResponse)
async def get_settings(current_user: UserInDB = Depends(get_current_user)):
    return UserResponse(
        id=current_user.id or "",
        name=current_user.name,
        email=current_user.email,
        timezone=current_user.timezone,
        role=current_user.preferences.role,
        preferences=current_user.preferences,
        working_hours=current_user.working_hours,
        notification_settings=current_user.notification_settings,
        onboarding_completed=current_user.onboarding_completed
    )


@router.patch("", response_model=UserResponse)
async def update_settings(update: UserUpdate, current_user: UserInDB = Depends(get_current_user)):
    users_col = get_users_collection()
    update_dict: Dict[str, Any] = {}

    if update.name is not None:
        update_dict["name"] = update.name
    if update.timezone is not None:
        update_dict["timezone"] = update.timezone
    if update.role is not None:
        update_dict["role"] = update.role
        update_dict["preferences.role"] = update.role
    if update.preferences is not None:
        update_dict["preferences"] = update.preferences.model_dump()
    if update.working_hours is not None:
        update_dict["working_hours"] = update.working_hours.model_dump()
    if update.notification_settings is not None:
        update_dict["notification_settings"] = update.notification_settings.model_dump()
    if update.onboarding_completed is not None:
        update_dict["onboarding_completed"] = update.onboarding_completed

    update_dict["updated_at"] = datetime.now(timezone.utc)

    query = {"_id": ObjectId(current_user.id)} if ObjectId.is_valid(current_user.id) else {"_id": current_user.id}
    await users_col.update_one(query, {"$set": update_dict})

    updated_doc = await users_col.find_one(query)
    updated_doc["_id"] = str(updated_doc["_id"])
    u = UserInDB(**updated_doc)

    return UserResponse(
        id=u.id or "",
        name=u.name,
        email=u.email,
        timezone=u.timezone,
        role=u.preferences.role,
        preferences=u.preferences,
        working_hours=u.working_hours,
        notification_settings=u.notification_settings,
        onboarding_completed=u.onboarding_completed
    )


@router.post("/export-data")
async def export_user_data(current_user: UserInDB = Depends(get_current_user)):
    """Exports all user data into a clean JSON bundle for GDPR and portability."""
    u_id = str(current_user.id)
    tasks = await get_tasks_collection().find({"user_id": u_id}).to_list(1000)
    blocks = await get_schedule_blocks_collection().find({"user_id": u_id}).to_list(1000)
    focus = await get_focus_sessions_collection().find({"user_id": u_id}).to_list(1000)
    reviews = await get_daily_reviews_collection().find({"user_id": u_id}).to_list(1000)
    memories = await get_agent_memories_collection().find({"user_id": u_id}).to_list(1000)

    def clean_docs(docs):
        res = []
        for d in docs:
            d_copy = dict(d)
            d_copy["id"] = str(d_copy.pop("_id"))
            # Serialize datetimes to ISO
            for k, v in d_copy.items():
                if isinstance(v, datetime):
                    d_copy[k] = v.isoformat()
            res.append(d_copy)
        return res

    return {
        "user_profile": {
            "id": u_id,
            "name": current_user.name,
            "email": current_user.email,
            "timezone": current_user.timezone,
            "preferences": current_user.preferences.model_dump(),
            "working_hours": current_user.working_hours.model_dump(),
            "notification_settings": current_user.notification_settings.model_dump(),
        },
        "tasks": clean_docs(tasks),
        "schedule_blocks": clean_docs(blocks),
        "focus_sessions": clean_docs(focus),
        "daily_reviews": clean_docs(reviews),
        "agent_memories": clean_docs(memories),
        "exported_at": datetime.now(timezone.utc).isoformat()
    }


@router.delete("/delete-account")
async def delete_user_account(current_user: UserInDB = Depends(get_current_user)):
    """Permanently deletes user account and all associated tasks, blocks, and records."""
    u_id = str(current_user.id)
    await get_tasks_collection().delete_many({"user_id": u_id})
    await get_schedule_blocks_collection().delete_many({"user_id": u_id})
    await get_focus_sessions_collection().delete_many({"user_id": u_id})
    await get_daily_reviews_collection().delete_many({"user_id": u_id})
    await get_agent_memories_collection().delete_many({"user_id": u_id})
    
    query = {"_id": ObjectId(u_id)} if ObjectId.is_valid(u_id) else {"_id": u_id}
    await get_users_collection().delete_one(query)

    return {"message": "Account and all associated personal data permanently deleted."}
