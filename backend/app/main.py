from __future__ import annotations

import asyncio
import logging
import os
import socketio
from contextlib import asynccontextmanager
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import ORJSONResponse
from fastapi.staticfiles import StaticFiles

from app.api.v1.router import api_router
from app.config import get_settings
from app.core.exceptions import AppException, app_exception_handler
from app.core.logging import setup_logging
from app.database import AsyncSessionLocal
from app.services.purge_service import run_all_purges
from app.dynamic_config import load_from_db as _load_dynamic_config

logger = logging.getLogger(__name__)

settings = get_settings()
setup_logging(debug=settings.APP_DEBUG)

# ── Daily retention purge (background task) ───────────────────────────────────

_purge_task: asyncio.Task | None = None

async def _daily_purge_loop() -> None:
    """Run data-retention purges once per day. Starts after a short delay so
    the app is fully initialised before the first run."""
    await asyncio.sleep(60)          # wait 60 s for DB pool to warm up
    while True:
        try:
            async with AsyncSessionLocal() as db:
                report = await run_all_purges(db)
                logger.info(
                    "daily_purge: total_affected=%d errors=%s",
                    report.total_affected,
                    report.errors or "none",
                )
        except Exception:
            logger.exception("daily_purge: unexpected error")
        await asyncio.sleep(86_400)  # sleep 24 h


@asynccontextmanager
async def lifespan(app: FastAPI):
    global _purge_task
    await _load_dynamic_config()
    logger.info("dynamic_config loaded from DB")
    _purge_task = asyncio.create_task(_daily_purge_loop())
    logger.info("daily_purge task started")
    yield
    if _purge_task and not _purge_task.done():
        _purge_task.cancel()
        try:
            await _purge_task
        except asyncio.CancelledError:
            pass
    logger.info("daily_purge task stopped")


app = FastAPI(
    title=settings.APP_NAME,
    version="1.0.0",
    docs_url="/docs" if settings.APP_DEBUG else None,
    redoc_url="/redoc" if settings.APP_DEBUG else None,
    default_response_class=ORJSONResponse,
    openapi_url="/openapi.json" if settings.APP_DEBUG else None,
    lifespan=lifespan,
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Exception handlers
app.add_exception_handler(AppException, app_exception_handler)

@app.exception_handler(Exception)
async def unhandled_exception_handler(request: Request, exc: Exception) -> ORJSONResponse:
    logger.exception("Unhandled error on %s %s", request.method, request.url.path)
    return ORJSONResponse(
        status_code=500,
        content={"detail": "Internal server error"},
    )

# API routes
app.include_router(api_router, prefix=settings.API_V1_PREFIX)

# Static files (avatars, documents, etc.) — served at /static/...
os.makedirs("static/avatars", exist_ok=True)
os.makedirs("static/documents", exist_ok=True)
os.makedirs("static/vehicles", exist_ok=True)
app.mount("/static", StaticFiles(directory="static"), name="static")

# Socket.IO — mounted at /ws
sio = socketio.AsyncServer(async_mode="asgi", cors_allowed_origins=settings.cors_origins_list)
socket_app = socketio.ASGIApp(sio, socketio_path="socket.io")
app.mount("/ws", socket_app)


@app.get("/health", tags=["System"])
async def health():
    return {"status": "ok", "app": settings.APP_NAME, "env": settings.APP_ENV}
