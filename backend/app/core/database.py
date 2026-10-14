import logging
from typing import Optional
from motor.motor_asyncio import AsyncIOMotorClient, AsyncIOMotorDatabase
from app.core.config import settings

logger = logging.getLogger(__name__)


class Database:
    client: Optional[AsyncIOMotorClient] = None
    db: Optional[AsyncIOMotorDatabase] = None


db_instance = Database()


async def connect_to_mongo():
    """Initializes MongoDB connection and creates indexes."""
    logger.info(f"Connecting to MongoDB at {settings.MONGODB_URI}...")
    try:
        db_instance.client = AsyncIOMotorClient(
            settings.MONGODB_URI,
            serverSelectionTimeoutMS=5000
        )
        db_instance.db = db_instance.client[settings.DATABASE_NAME]
        
        # Test connection ping
        await db_instance.client.admin.command("ping")
        logger.info(f"Successfully connected to MongoDB database: {settings.DATABASE_NAME}")
        
        # Setup indexes
        await setup_indexes()
    except Exception as e:
        logger.error(f"Failed to connect to MongoDB: {e}")
        # Allow server to start, will retry or log warning
        raise e


async def close_mongo_connection():
    """Closes MongoDB connection."""
    if db_instance.client:
        logger.info("Closing MongoDB connection...")
        db_instance.client.close()
        logger.info("MongoDB connection closed.")


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
        logger.info("Database indexes successfully ensured.")
    except Exception as e:
        logger.warning(f"Error while creating indexes: {e}")


def get_database() -> AsyncIOMotorDatabase:
    """Returns the database instance."""
    if db_instance.db is None:
        raise RuntimeError("Database is not connected. Call connect_to_mongo first.")
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
