import logging
from typing import Optional, Any
from app.core.config import settings
from app.core.sqlite_db import SQLiteDatabase

logger = logging.getLogger(__name__)


class Database:
    client: Any = None
    db: Any = None


db_instance = Database()


async def connect_to_mongo():
    """Initializes Database connection. Default is zero-config embedded SQLite."""
    use_sqlite = (
        settings.DATABASE_TYPE.lower() == "sqlite"
        or not settings.MONGODB_URI
        or "localhost" in settings.MONGODB_URI
        or "127.0.0.1" in settings.MONGODB_URI
    )

    if use_sqlite:
        logger.info(f"Using SQLite database engine at '{settings.SQLITE_PATH}' (Zero-config, embedded)")
        sqlite_db = SQLiteDatabase(db_path=settings.SQLITE_PATH)
        db_instance.db = sqlite_db
        await setup_indexes()
        logger.info(f"Successfully initialized SQLite database at {settings.SQLITE_PATH}")
        return

    # Attempt MongoDB if an external URI (e.g. Atlas) is configured
    display_uri = settings.MONGODB_URI
    if "@" in display_uri:
        try:
            scheme, rest = display_uri.split("://", 1)
            creds, host_part = rest.split("@", 1)
            display_uri = f"{scheme}://***:***@{host_part}"
        except Exception:
            display_uri = "mongodb+srv://***:***@..."

    logger.info(f"Connecting to MongoDB at {display_uri}...")
    try:
        from motor.motor_asyncio import AsyncIOMotorClient
        db_instance.client = AsyncIOMotorClient(
            settings.MONGODB_URI,
            serverSelectionTimeoutMS=5000
        )
        db_instance.db = db_instance.client[settings.DATABASE_NAME]
        
        # Test connection ping
        await db_instance.client.admin.command("ping")
        logger.info(f"Successfully connected to MongoDB database: {settings.DATABASE_NAME}")
        await setup_indexes()
    except Exception as e:
        logger.warning(
            f"Failed to connect to MongoDB ({display_uri}): {e}. "
            f"Falling back to embedded SQLite database at '{settings.SQLITE_PATH}'."
        )
        sqlite_db = SQLiteDatabase(db_path=settings.SQLITE_PATH)
        db_instance.db = sqlite_db
        await setup_indexes()
        logger.info("Fallback to SQLite completed successfully.")


async def close_mongo_connection():
    """Closes Database connection."""
    if db_instance.client:
        logger.info("Closing MongoDB connection...")
        db_instance.client.close()
        logger.info("MongoDB connection closed.")
    elif db_instance.db and hasattr(db_instance.db, "close"):
        db_instance.db.close()


async def setup_indexes():
    """Sets up appropriate database indexes for performance and constraints."""
    db = db_instance.db
    if db is None:
        return

    try:
        # Users
        await db.users.create_index("email", unique=True)
        
        # Tasks
        await db.tasks.create_index([("user_id", 1), ("status", 1)])
        await db.tasks.create_index([("user_id", 1), ("due_date", 1)])
        await db.tasks.create_index([("user_id", 1), ("priority", 1)])
        
        # Schedule Blocks
        await db.schedule_blocks.create_index([("user_id", 1), ("start_time", 1)])
        await db.schedule_blocks.create_index([("user_id", 1), ("plan_date", 1)])
        
        # Focus Sessions
        await db.focus_sessions.create_index([("user_id", 1), ("started_at", -1)])
        
        # Goals
        await db.goals.create_index([("user_id", 1), ("status", 1)])
        
        # Daily Reviews
        await db.daily_reviews.create_index([("user_id", 1), ("review_date", 1)], unique=True)
        
        # Agent Memories
        await db.agent_memories.create_index([("user_id", 1), ("memory_type", 1)])
        logger.info("Database initialized successfully.")
        
        # Seed demo account
        await seed_demo_user()
    except Exception as e:
        logger.warning(f"Error while creating indexes: {e}")


async def seed_demo_user():
    """Seeds the demo student account if it does not already exist."""
    try:
        users_col = get_users_collection()
        demo_email = "demo.student@taskflow.ai"
        existing = await users_col.find_one({"email": demo_email})
        if not existing:
            from datetime import datetime, timezone, timedelta
            from app.core.security import hash_password
            from app.models.user import UserPreferences, WorkingHours, NotificationSettings
            from app.models.task import TaskInDB, PriorityLevel, TaskStatus
            from app.services.prioritization_service import PrioritizationService

            now = datetime.now(timezone.utc)
            demo_user = {
                "email": demo_email,
                "name": "Alex Turner (Demo)",
                "password_hash": hash_password("TaskFlowDemo2026!"),
                "timezone": "UTC",
                "preferences": UserPreferences(role="student").model_dump(),
                "working_hours": WorkingHours().model_dump(),
                "notification_settings": NotificationSettings().model_dump(),
                "onboarding_completed": True,
                "created_at": now,
                "updated_at": now
            }
            res = await users_col.insert_one(demo_user)
            user_id = str(res.inserted_id)
            logger.info(f"Seeded demo student account ({demo_email}) with ID: {user_id}")

            tasks_col = get_tasks_collection()
            sample_tasks = [
                {
                    "title": "Complete DBMS Exam Revision & Past Papers",
                    "description": "Review indexing, B-trees, normalization, and ACID properties.",
                    "category": "study",
                    "priority": PriorityLevel.CRITICAL,
                    "due_date": now + timedelta(hours=6),
                    "estimated_duration": 90,
                    "importance": 5,
                    "urgency": 5,
                    "energy_level": "high"
                },
                {
                    "title": "Build Full-Stack Task Flow Agent API Endpoint",
                    "description": "Implement slot allocation algorithm and dynamic replanning unit tests.",
                    "category": "coding",
                    "priority": PriorityLevel.HIGH,
                    "due_date": now + timedelta(days=1),
                    "estimated_duration": 60,
                    "importance": 4,
                    "urgency": 4,
                    "energy_level": "high"
                },
                {
                    "title": "Evening Cardio & Posture Stretching",
                    "description": "30 minutes brisk jog followed by mobility stretching routine.",
                    "category": "health",
                    "priority": PriorityLevel.MEDIUM,
                    "due_date": now + timedelta(hours=10),
                    "estimated_duration": 35,
                    "importance": 4,
                    "urgency": 2,
                    "energy_level": "medium"
                }
            ]
            for st in sample_tasks:
                t = TaskInDB(
                    user_id=user_id,
                    title=st["title"],
                    description=st["description"],
                    category=st["category"],
                    priority=st["priority"],
                    status=TaskStatus.PENDING,
                    due_date=st["due_date"],
                    estimated_duration=st["estimated_duration"],
                    importance=st["importance"],
                    urgency=st["urgency"],
                    energy_level=st["energy_level"],
                    created_at=now,
                    updated_at=now
                )
                score, bucket = PrioritizationService.calculate_priority_score(t, None, now)
                t.priority_score = score
                t.priority_bucket = bucket
                await tasks_col.insert_one(t.model_dump(by_alias=True, exclude={"id"}))
            logger.info("Seeded initial tasks for demo account.")
    except Exception as e:
        logger.warning(f"Error seeding demo account: {e}")


def get_database() -> Any:
    """Returns the database instance. Lazily initializes SQLite if needed."""
    if db_instance.db is None:
        logger.info(f"Lazily initializing SQLite database at '{settings.SQLITE_PATH}'...")
        db_instance.db = SQLiteDatabase(db_path=settings.SQLITE_PATH)
    return db_instance.db


# Convenience collection accessors
def get_users_collection():
    return get_database()["users"]

def get_tasks_collection():
    return get_database()["tasks"]

def get_schedule_blocks_collection():
    return get_database()["schedule_blocks"]

def get_focus_sessions_collection():
    return get_database()["focus_sessions"]

def get_daily_reviews_collection():
    return get_database()["daily_reviews"]

def get_agent_memories_collection():
    return get_database()["agent_memories"]

def get_goals_collection():
    return get_database()["goals"]
