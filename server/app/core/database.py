import logging

from beanie import init_beanie
from motor.motor_asyncio import AsyncIOMotorClient

from app.core.config import settings
from app.models.game_session import GameSession
from app.models.score import Score
from app.models.transaction import Transaction
from app.models.user import User

logger = logging.getLogger("gameverse.database")


class Database:
    client: AsyncIOMotorClient = None


db = Database()


async def init_db():
    """
    Initializes the asynchronous Motor MongoDB client and registers
    Beanie ODM document models with auto-indexing.
    """
    logger.info(
        f"Connecting to MongoDB at {settings.MONGODB_URL} (db: {settings.MONGODB_DB_NAME})..."
    )
    db.client = AsyncIOMotorClient(settings.MONGODB_URL)
    database = db.client[settings.MONGODB_DB_NAME]

    # Initialize Beanie with document models
    await init_beanie(
        database=database,
        document_models=[
            User,
            GameSession,
            Score,
            Transaction,
        ]
    )
    logger.info("Connected to MongoDB & Beanie ODM initialized successfully.")


async def close_db():
    """Closes the MongoDB connection client."""
    if db.client:
        logger.info("Closing MongoDB connection...")
        db.client.close()
