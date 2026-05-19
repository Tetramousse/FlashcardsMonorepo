import io
import asyncio
import httpx
import firebase_admin
import logging
import time
import os
from contextlib import asynccontextmanager
from typing import Optional

from fastapi import FastAPI, Request, Response, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.trustedhost import TrustedHostMiddleware
from firebase_admin import credentials
from sqlalchemy.ext.asyncio import AsyncSession, AsyncEngine

from api.app.models.db import Base
from api.app.config import get_settings
from api.app.router import v1_router
from api.app import dependencies

settings = get_settings()
logger = logging.getLogger("flashcard_api")
logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")


@asynccontextmanager
async def lifespan(app: FastAPI):
    dependencies.init_db()

    cred = credentials.Certificate(settings.firebase_credentials_path)
    firebase_admin.initialize_app(cred)

    async with dependencies.engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    async with httpx.AsyncClient(
        timeout=120.0,
        limits=httpx.Limits(max_connections=100, max_keepalive_connections=20),
    ) as client:
        app.state.http_client = client
        yield

    await dependencies.engine.dispose()


app = FastAPI(title="FlashcardAPI", lifespan=lifespan)

app.add_middleware(TrustedHostMiddleware, allowed_hosts=["*"])


@app.middleware("http")
async def log_requests(request: Request, call_next):
    start = time.perf_counter()
    response = await call_next(request)
    duration = time.perf_counter() - start
    logger.info(
        "%s %s %s %.3fs %s",
        request.method,
        request.url.path,
        response.status_code,
        duration,
        request.headers.get("user-agent", "-"),
    )
    response.headers["X-Process-Time"] = f"{duration:.3f}"
    return response


_raw_origins = os.getenv("ALLOWED_ORIGINS", "")
allowed_origins = [o.strip() for o in _raw_origins.split(",")] if _raw_origins else ["*"]

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_methods=["GET", "POST", "DELETE"],
    allow_headers=["Authorization", "Content-Type"],
    allow_credentials=allowed_origins != ["*"],
)

app.include_router(v1_router)
