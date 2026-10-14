from datetime import datetime, timezone, timedelta
from typing import List, Optional
from fastapi import APIRouter, HTTPException, status, Depends, Query
from bson import ObjectId
from app.core.database import get_tasks_collection
from app.models.task import TaskInDB, TaskStatus, PriorityLevel, RecurrenceRule, SubTask
from app.models.user import UserInDB
from app.schemas.task import TaskCreate, TaskUpdate, TaskResponse
from app.services.prioritization_service import PrioritizationService
from app.api.deps import get_current_user

router = APIRouter(prefix="/tasks", tags=["Tasks"])


def doc_to_response(doc: dict) -> TaskResponse:
    doc["id"] = str(doc["_id"])
    return TaskResponse(**doc)


@router.get("", response_model=List[TaskResponse])
async def list_tasks(
    status: Optional[str] = Query(None),
    category: Optional[str] = Query(None),
    priority: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
    current_user: UserInDB = Depends(get_current_user)
):
    tasks_col = get_tasks_collection()
    query: dict = {"user_id": str(current_user.id)}

    if status:
        query["status"] = status
    if category:
        query["category"] = category
    if priority:
        query["priority"] = priority
    if search:
        query["$or"] = [
            {"title": {"$regex": search, "$options": "i"}},
            {"description": {"$regex": search, "$options": "i"}}
        ]

    cursor = tasks_col.find(query).sort("priority_score", -1)
    docs = await cursor.to_list(length=200)
    return [doc_to_response(d) for d in docs]


@router.post("", response_model=TaskResponse, status_code=status.HTTP_201_CREATED)
async def create_task(req: TaskCreate, current_user: UserInDB = Depends(get_current_user)):
    tasks_col = get_tasks_collection()
    now = datetime.now(timezone.utc)

    # Subtasks mapping
    subtasks = [
        SubTask(
            id=str(ObjectId()),
            title=st.title,
            estimated_duration=st.estimated_duration,
            completion_criteria=st.completion_criteria,
            order=idx + 1
        )
        for idx, st in enumerate(req.subtasks)
    ]

    # Pre-model instance to calculate priority score
    temp_task = TaskInDB(
        user_id=str(current_user.id),
        title=req.title,
        description=req.description,
        category=req.category,
        priority=req.priority,
        status=TaskStatus.PENDING,
        due_date=req.due_date,
        estimated_duration=req.estimated_duration,
        preferred_time=req.preferred_time,
        dependencies=req.dependencies,
        subtasks=subtasks,
        recurrence=req.recurrence,
        goal_id=req.goal_id,
        energy_level=req.energy_level,
        importance=req.importance,
        urgency=req.urgency,
        created_at=now,
        updated_at=now
    )

    # Calculate deterministic priority score
    all_user_tasks_cursor = tasks_col.find({"user_id": str(current_user.id)})
    all_user_tasks = [TaskInDB(**d) for d in await all_user_tasks_cursor.to_list(100)]
    
    score, bucket = PrioritizationService.calculate_priority_score(temp_task, all_user_tasks, now)
    temp_task.priority_score = score
    temp_task.priority_bucket = bucket

    task_dict = temp_task.model_dump(by_alias=True, exclude={"id"})
    res = await tasks_col.insert_one(task_dict)
    task_dict["_id"] = res.inserted_id

    return doc_to_response(task_dict)


@router.get("/{task_id}", response_model=TaskResponse)
async def get_task(task_id: str, current_user: UserInDB = Depends(get_current_user)):
    tasks_col = get_tasks_collection()
    query = {"_id": ObjectId(task_id), "user_id": str(current_user.id)} if ObjectId.is_valid(task_id) else {"_id": task_id, "user_id": str(current_user.id)}
    doc = await tasks_col.find_one(query)
    if not doc:
        raise HTTPException(status_code=404, detail="Task not found")
    return doc_to_response(doc)


@router.patch("/{task_id}", response_model=TaskResponse)
async def update_task(task_id: str, update: TaskUpdate, current_user: UserInDB = Depends(get_current_user)):
    tasks_col = get_tasks_collection()
    query = {"_id": ObjectId(task_id), "user_id": str(current_user.id)} if ObjectId.is_valid(task_id) else {"_id": task_id, "user_id": str(current_user.id)}
    
    existing = await tasks_col.find_one(query)
    if not existing:
        raise HTTPException(status_code=404, detail="Task not found")

    update_dict = {k: v for k, v in update.model_dump().items() if v is not None}
    update_dict["updated_at"] = datetime.now(timezone.utc)

    # Handle status change to completed
    if update.status == TaskStatus.COMPLETED and existing.get("status") != TaskStatus.COMPLETED:
        update_dict["completed_at"] = datetime.now(timezone.utc)
    elif update.status == TaskStatus.PENDING:
        update_dict["completed_at"] = None

    await tasks_col.update_one(query, {"$set": update_dict})
    
    # Recalculate priority if key fields changed
    updated_doc = await tasks_col.find_one(query)
    task_obj = TaskInDB(**updated_doc)
    score, bucket = PrioritizationService.calculate_priority_score(task_obj)
    await tasks_col.update_one(query, {"$set": {"priority_score": score, "priority_bucket": bucket}})
    updated_doc["priority_score"] = score
    updated_doc["priority_bucket"] = bucket

    return doc_to_response(updated_doc)


@router.delete("/{task_id}")
async def delete_task(task_id: str, current_user: UserInDB = Depends(get_current_user)):
    tasks_col = get_tasks_collection()
    query = {"_id": ObjectId(task_id), "user_id": str(current_user.id)} if ObjectId.is_valid(task_id) else {"_id": task_id, "user_id": str(current_user.id)}
    res = await tasks_col.delete_one(query)
    if res.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Task not found")
    return {"message": "Task deleted successfully"}


@router.post("/{task_id}/complete", response_model=TaskResponse)
async def complete_task(task_id: str, current_user: UserInDB = Depends(get_current_user)):
    tasks_col = get_tasks_collection()
    now = datetime.now(timezone.utc)
    query = {"_id": ObjectId(task_id), "user_id": str(current_user.id)} if ObjectId.is_valid(task_id) else {"_id": task_id, "user_id": str(current_user.id)}
    
    doc = await tasks_col.find_one(query)
    if not doc:
        raise HTTPException(status_code=404, detail="Task not found")

    await tasks_col.update_one(
        query,
        {"$set": {"status": TaskStatus.COMPLETED, "completed_at": now, "updated_at": now}}
    )
    doc["status"] = TaskStatus.COMPLETED
    doc["completed_at"] = now
    return doc_to_response(doc)


@router.post("/{task_id}/reopen", response_model=TaskResponse)
async def reopen_task(task_id: str, current_user: UserInDB = Depends(get_current_user)):
    tasks_col = get_tasks_collection()
    now = datetime.now(timezone.utc)
    query = {"_id": ObjectId(task_id), "user_id": str(current_user.id)} if ObjectId.is_valid(task_id) else {"_id": task_id, "user_id": str(current_user.id)}
    
    doc = await tasks_col.find_one(query)
    if not doc:
        raise HTTPException(status_code=404, detail="Task not found")

    await tasks_col.update_one(
        query,
        {"$set": {"status": TaskStatus.PENDING, "completed_at": None, "updated_at": now}}
    )
    doc["status"] = TaskStatus.PENDING
    doc["completed_at"] = None
    return doc_to_response(doc)


@router.post("/seed-demo", response_model=List[TaskResponse])
async def seed_demo_tasks(current_user: UserInDB = Depends(get_current_user)):
    """Seeds realistic role-specific tasks for testing and instant user delight."""
    tasks_col = get_tasks_collection()
    now = datetime.now(timezone.utc)

    role = current_user.preferences.role or "student"

    if role == "student":
        sample_tasks = [
            {
                "title": "Complete DBMS Normalization Notes",
                "description": "Revise BCNF, 3NF lossy vs lossless decomposition with 5 practice problems.",
                "category": "study",
                "priority": PriorityLevel.CRITICAL,
                "due_date": now + timedelta(hours=4),
                "estimated_duration": 60,
                "importance": 5,
                "urgency": 5,
                "energy_level": "high",
                "subtasks": [
                    {"id": str(ObjectId()), "title": "Review 2NF & 3NF definitions", "estimated_duration": 15, "completed": True, "order": 1},
                    {"id": str(ObjectId()), "title": "Solve 3 BCNF decomposition examples", "estimated_duration": 30, "completed": False, "order": 2},
                    {"id": str(ObjectId()), "title": "Collate final summary formula sheet", "estimated_duration": 15, "completed": False, "order": 3}
                ]
            },
            {
                "title": "Prepare Machine Learning Presentation Slides",
                "description": "Outline transformer attention mechanism and CNN comparison for Friday lab.",
                "category": "study",
                "priority": PriorityLevel.HIGH,
                "due_date": now + timedelta(days=2),
                "estimated_duration": 90,
                "importance": 4,
                "urgency": 4,
                "energy_level": "high"
            },
            {
                "title": "Solve 3 LeetCode Binary Search Problems",
                "description": "Practice search in rotated sorted array and median of two arrays.",
                "category": "coding",
                "priority": PriorityLevel.MEDIUM,
                "due_date": now + timedelta(days=1),
                "estimated_duration": 45,
                "importance": 4,
                "urgency": 3,
                "energy_level": "high"
            },
            {
                "title": "Revise Probability & Statistics Formula Sheet",
                "description": "Bayes theorem, Gaussian distribution, and expectation integrals.",
                "category": "study",
                "priority": PriorityLevel.HIGH,
                "due_date": now + timedelta(days=3),
                "estimated_duration": 40,
                "importance": 4,
                "urgency": 3,
                "energy_level": "medium"
            },
            {
                "title": "Submit Lab Assignment 4 Report",
                "description": "Compile PDF results and upload to course portal.",
                "category": "study",
                "priority": PriorityLevel.LOW,
                "due_date": now + timedelta(days=4),
                "estimated_duration": 20,
                "importance": 3,
                "urgency": 2,
                "energy_level": "low"
            }
        ]
    elif role == "developer":
        sample_tasks = [
            {
                "title": "Fix Race Condition in Payment Webhook",
                "description": "Add idempotency key checks and distributed lock in Redis.",
                "category": "coding",
                "priority": PriorityLevel.CRITICAL,
                "due_date": now + timedelta(hours=3),
                "estimated_duration": 60,
                "importance": 5,
                "urgency": 5,
                "energy_level": "high"
            },
            {
                "title": "Refactor User Authentication Middleware",
                "description": "Migrate to JWT with token rotation and cache verification.",
                "category": "coding",
                "priority": PriorityLevel.HIGH,
                "due_date": now + timedelta(days=2),
                "estimated_duration": 90,
                "importance": 4,
                "urgency": 4,
                "energy_level": "high"
            },
            {
                "title": "Review Pull Requests for Release v1.4",
                "description": "Inspect 4 PRs for API stability and test coverage.",
                "category": "work",
                "priority": PriorityLevel.MEDIUM,
                "due_date": now + timedelta(hours=6),
                "estimated_duration": 30,
                "importance": 3,
                "urgency": 4,
                "energy_level": "medium"
            },
            {
                "title": "Write Unit Tests for Schedule Engine",
                "description": "Cover boundary cases for daylight savings and overlapping slots.",
                "category": "coding",
                "priority": PriorityLevel.HIGH,
                "due_date": now + timedelta(days=1),
                "estimated_duration": 45,
                "importance": 4,
                "urgency": 3,
                "energy_level": "medium"
            }
        ]
    else:
        sample_tasks = [
            {
                "title": "Prepare Q3 Department Budget Review",
                "description": "Consolidate expense spreadsheets and draft highlights for stakeholders.",
                "category": "work",
                "priority": PriorityLevel.CRITICAL,
                "due_date": now + timedelta(hours=5),
                "estimated_duration": 75,
                "importance": 5,
                "urgency": 5,
                "energy_level": "high"
            },
            {
                "title": "Client Status Alignment Call & Notes",
                "description": "Summarize deliverables timeline and action items.",
                "category": "work",
                "priority": PriorityLevel.HIGH,
                "due_date": now + timedelta(days=1),
                "estimated_duration": 45,
                "importance": 4,
                "urgency": 4,
                "energy_level": "medium"
            },
            {
                "title": "30-Minute Cardiovascular Workout",
                "description": "Brisk run or interval training session.",
                "category": "health",
                "priority": PriorityLevel.MEDIUM,
                "due_date": now + timedelta(hours=8),
                "estimated_duration": 30,
                "importance": 4,
                "urgency": 3,
                "energy_level": "medium"
            },
            {
                "title": "Order Weekly Groceries & Meal Prep",
                "description": "Restock fresh vegetables and healthy protein staples.",
                "category": "errand",
                "priority": PriorityLevel.LOW,
                "due_date": now + timedelta(days=2),
                "estimated_duration": 25,
                "importance": 2,
                "urgency": 2,
                "energy_level": "low"
            }
        ]

    created = []
    for item in sample_tasks:
        subtasks = [SubTask(**st) for st in item.get("subtasks", [])]
        t = TaskInDB(
            user_id=str(current_user.id),
            title=item["title"],
            description=item.get("description", ""),
            category=item.get("category", "general"),
            priority=item["priority"],
            status=TaskStatus.PENDING,
            due_date=item.get("due_date"),
            estimated_duration=item.get("estimated_duration", 30),
            subtasks=subtasks,
            importance=item.get("importance", 3),
            urgency=item.get("urgency", 3),
            energy_level=item.get("energy_level", "medium"),
            created_at=now,
            updated_at=now
        )
        score, bucket = PrioritizationService.calculate_priority_score(t, None, now)
        t.priority_score = score
        t.priority_bucket = bucket

        d = t.model_dump(by_alias=True, exclude={"id"})
        res = await tasks_col.insert_one(d)
        d["_id"] = res.inserted_id
        created.append(doc_to_response(d))

    return created
