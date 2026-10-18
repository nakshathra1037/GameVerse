from fastapi import APIRouter

from app.core.database import db
from app.schemas.common import APIResponse

router = APIRouter(tags=["Health"])


@router.get("/health")
async def health_check():
    """
    Health check endpoint to verify backend service status and MongoDB connectivity.
    Returns standard API envelope format.
    """
    db_status = "disconnected"
    is_healthy = False
    try:
        if db.client:
            # Perform a quick ping command to verify MongoDB responds
            await db.client.admin.command("ping")
            db_status = "connected"
            is_healthy = True
    except Exception as e:
        db_status = f"error: {e!s}"

    return APIResponse(
        success=is_healthy,
        data={
            "status": "ok" if is_healthy else "degraded",
            "service": "GameVerse API",
            "database": db_status
        }
    )
