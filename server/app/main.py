import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI, HTTPException, Request, status
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.core.config import settings
from app.core.database import close_db, init_db
from app.routers import auth, games, health

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - [%(levelname)s] - %(name)s - %(message)s"
)
logger = logging.getLogger("gameverse.main")


@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    FastAPI lifespan manager handling startup and shutdown events:
    - On startup: Connect to MongoDB and register Beanie document models.
    - On shutdown: Close database connections gracefully.
    """
    logger.info("Initializing GameVerse API...")
    await init_db()
    yield
    logger.info("Shutting down GameVerse API...")
    await close_db()


app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    description="Backend API for GameVerse - Gamified Mini-Game Arena & Progression Platform",
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url="/redoc",
)

# Configure Cross-Origin Resource Sharing (CORS) for React client
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ==============================================================================
# Consistent API Exception Handlers
# Guarantees that all errors follow the contract:
# { "success": false, "data": null, "error": { "code": str, "message": str } }
# ==============================================================================
@app.exception_handler(HTTPException)
async def custom_http_exception_handler(request: Request, exc: HTTPException):
    code_map = {
        status.HTTP_400_BAD_REQUEST: "BAD_REQUEST",
        status.HTTP_401_UNAUTHORIZED: "UNAUTHORIZED",
        status.HTTP_403_FORBIDDEN: "FORBIDDEN",
        status.HTTP_404_NOT_FOUND: "NOT_FOUND",
        status.HTTP_429_TOO_MANY_REQUESTS: "RATE_LIMIT_EXCEEDED",
    }
    error_code = code_map.get(exc.status_code, f"HTTP_{exc.status_code}")
    headers = getattr(exc, "headers", None)

    return JSONResponse(
        status_code=exc.status_code,
        content={
            "success": False,
            "data": None,
            "error": {
                "code": error_code,
                "message": str(exc.detail),
                "details": None
            }
        },
        headers=headers
    )


@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    return JSONResponse(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        content={
            "success": False,
            "data": None,
            "error": {
                "code": "VALIDATION_ERROR",
                "message": "Input validation failed. Please check the submitted fields.",
                "details": exc.errors()
            }
        }
    )


@app.exception_handler(Exception)
async def generic_exception_handler(request: Request, exc: Exception):
    logger.error(f"Unhandled server error: {exc}", exc_info=True)
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={
            "success": False,
            "data": None,
            "error": {
                "code": "INTERNAL_SERVER_ERROR",
                "message": "An unexpected server error occurred.",
                "details": str(exc) if settings.PORT == 8000 else None
            }
        }
    )


# Register API routers with /api/v1 prefix as requested
app.include_router(health.router, prefix=settings.API_V1_PREFIX)
app.include_router(auth.router, prefix=settings.API_V1_PREFIX)
app.include_router(games.router, prefix=settings.API_V1_PREFIX)

# Also mount on /api for convenience/backwards compatibility
app.include_router(health.router, prefix="/api")
app.include_router(auth.router, prefix="/api")
app.include_router(games.router, prefix="/api")


@app.get("/", tags=["Root"])
async def root():
    return {
        "message": "Welcome to GameVerse API",
        "version": settings.VERSION,
        "docs": "/docs",
        "health": f"{settings.API_V1_PREFIX}/health"
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host=settings.HOST, port=settings.PORT, reload=True)
