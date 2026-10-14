from datetime import datetime, timezone
from fastapi import APIRouter, HTTPException, status, Depends
from bson import ObjectId
from app.core.security import hash_password, verify_password, create_access_token
from app.core.database import get_users_collection
from app.models.user import UserInDB, UserPreferences, WorkingHours, NotificationSettings
from app.schemas.auth import UserRegister, UserLogin, TokenResponse, UserResponse, UserUpdate
from app.api.deps import get_current_user

router = APIRouter(prefix="/auth", tags=["Authentication"])


@router.post("/register", response_model=TokenResponse)
async def register(req: UserRegister):
    users_col = get_users_collection()
    
    # Check if user already exists
    existing = await users_col.find_one({"email": req.email.lower()})
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="A user with this email address already exists."
        )

    preferences = UserPreferences(role=req.role or "student")
    working_hours = WorkingHours()
    notification_settings = NotificationSettings()

    user_dict = {
        "email": req.email.lower(),
        "name": req.name,
        "password_hash": hash_password(req.password),
        "timezone": req.timezone or "UTC",
        "preferences": preferences.model_dump(),
        "working_hours": working_hours.model_dump(),
        "notification_settings": notification_settings.model_dump(),
        "onboarding_completed": False,
        "created_at": datetime.now(timezone.utc),
        "updated_at": datetime.now(timezone.utc)
    }

    res = await users_col.insert_one(user_dict)
    user_id = str(res.inserted_id)

    access_token = create_access_token(data={"sub": user_id, "email": req.email.lower()})
    
    user_response = UserResponse(
        id=user_id,
        name=req.name,
        email=req.email.lower(),
        timezone=req.timezone or "UTC",
        role=preferences.role,
        preferences=preferences,
        working_hours=working_hours,
        notification_settings=notification_settings,
        onboarding_completed=False
    )

    return TokenResponse(access_token=access_token, user=user_response)


@router.post("/login", response_model=TokenResponse)
async def login(req: UserLogin):
    users_col = get_users_collection()
    user_doc = await users_col.find_one({"email": req.email.lower()})
    
    if not user_doc or not verify_password(req.password, user_doc["password_hash"]):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password."
        )

    user_id = str(user_doc["_id"])
    access_token = create_access_token(data={"sub": user_id, "email": user_doc["email"]})

    user_response = UserResponse(
        id=user_id,
        name=user_doc["name"],
        email=user_doc["email"],
        timezone=user_doc.get("timezone", "UTC"),
        role=user_doc.get("preferences", {}).get("role", "student"),
        preferences=UserPreferences(**user_doc.get("preferences", {})),
        working_hours=WorkingHours(**user_doc.get("working_hours", {})),
        notification_settings=NotificationSettings(**user_doc.get("notification_settings", {})),
        onboarding_completed=user_doc.get("onboarding_completed", False)
    )

    return TokenResponse(access_token=access_token, user=user_response)


@router.get("/me", response_model=UserResponse)
async def get_me(current_user: UserInDB = Depends(get_current_user)):
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


@router.patch("/me", response_model=UserResponse)
async def update_me(update: UserUpdate, current_user: UserInDB = Depends(get_current_user)):
    users_col = get_users_collection()
    update_data = {}
    
    if update.name is not None:
        update_data["name"] = update.name
    if update.timezone is not None:
        update_data["timezone"] = update.timezone
    if update.onboarding_completed is not None:
        update_data["onboarding_completed"] = update.onboarding_completed
    if update.preferences is not None:
        update_data["preferences"] = update.preferences.model_dump()
    if update.working_hours is not None:
        update_data["working_hours"] = update.working_hours.model_dump()
    if update.notification_settings is not None:
        update_data["notification_settings"] = update.notification_settings.model_dump()

    update_data["updated_at"] = datetime.now(timezone.utc)

    query = {"_id": ObjectId(current_user.id)} if ObjectId.is_valid(current_user.id) else {"_id": current_user.id}
    await users_col.update_one(query, {"$set": update_data})
    
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


@router.post("/logout")
async def logout():
    return {"message": "Successfully logged out."}
