import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from app.core.config import settings
from app.core.database import connect_to_mongo, close_mongo_connection
from app.api import auth, tasks, planner, assistant, calendar, focus, analytics, reviews, settings as settings_api

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s"
)
logger = logging.getLogger("taskflow_ai")


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    logger.info("Starting TaskFlow AI backend service...")
    try:
        await connect_to_mongo()
    except Exception as e:
        logger.error(f"MongoDB startup connection error: {e}")
    yield
    # Shutdown
    logger.info("Shutting down TaskFlow AI backend service...")
    await close_mongo_connection()


app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    description="Intelligent Daily Task Planner Agent — Production-ready API",
    lifespan=lifespan
)

# CORS Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Global Exception Handler
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    logger.error(f"Unhandled exception at {request.method} {request.url.path}: {exc}", exc_info=True)
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={"detail": "An internal server error occurred. Please try again."}
    )


# Root endpoint
@app.api_route("/", methods=["GET", "HEAD"], tags=["System"])
async def root():
    return {
        "service": settings.PROJECT_NAME,
        "version": settings.VERSION,
        "status": "online",
        "docs": "/docs",
        "health": "/api/health"
    }


# Health check
@app.api_route("/api/health", methods=["GET", "HEAD"], tags=["System"])
async def health_check():
    return {
        "status": "healthy",
        "service": settings.PROJECT_NAME,
        "version": settings.VERSION
    }


# Include Routers
app.include_router(auth.router, prefix="/api")
app.include_router(tasks.router, prefix="/api")
app.include_router(planner.router, prefix="/api")
app.include_router(assistant.router, prefix="/api")
app.include_router(calendar.router, prefix="/api")
app.include_router(focus.router, prefix="/api")
app.include_router(analytics.router, prefix="/api")
app.include_router(reviews.router, prefix="/api")
app.include_router(settings_api.router, prefix="/api")


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=True)
