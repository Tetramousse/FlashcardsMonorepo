import io
import asyncio
import httpx
import firebase_admin
import logging
import time
import os
from uuid import UUID
from typing import List, Optional
from contextlib import asynccontextmanager

from fastapi import (
    FastAPI,
    UploadFile,
    File,
    Form,
    HTTPException,
    Depends,
    APIRouter,
    status,
    Response,
    Request,
)
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.trustedhost import TrustedHostMiddleware
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from firebase_admin import credentials, auth as firebase_auth
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, AsyncEngine
from sqlalchemy.orm import sessionmaker, selectinload
from sqlalchemy import select, func
from pydantic import BaseModel

from models import Base, FileModel, ChunkModel, FileSummary
from config import get_settings

settings = get_settings()
logger = logging.getLogger("flashcard_api")
logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")

engine: Optional[AsyncEngine] = None
AsyncSessionLocal = None
_bearer = HTTPBearer(auto_error=False)


async def get_current_user(
    token: HTTPAuthorizationCredentials = Depends(_bearer),
) -> dict:
    if not token:
        raise HTTPException(status_code=401, detail="Token mancante")
    try:
        decoded = await asyncio.to_thread(
            firebase_auth.verify_id_token, token.credentials
        )
        return decoded
    except firebase_admin.auth.ExpiredIdTokenError:
        raise HTTPException(status_code=401, detail="Token scaduto")
    except firebase_admin.auth.InvalidIdTokenError:
        raise HTTPException(status_code=401, detail="Token non valido")
    except Exception:
        raise HTTPException(status_code=401, detail="Autenticazione fallita")


async def get_db():
    if AsyncSessionLocal is None:
        raise HTTPException(status_code=500, detail="Database non inizializzato")
    async with AsyncSessionLocal() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise


def get_http_client(request: Request) -> httpx.AsyncClient:
    return request.app.state.http_client


@asynccontextmanager
async def lifespan(app: FastAPI):
    global engine, AsyncSessionLocal

    cred = credentials.Certificate(settings.firebase_credentials_path)
    firebase_admin.initialize_app(cred)

    engine = create_async_engine(settings.database_url, echo=False)
    AsyncSessionLocal = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    async with httpx.AsyncClient(
        timeout=120.0,
        limits=httpx.Limits(max_connections=100, max_keepalive_connections=20),
    ) as client:
        app.state.http_client = client
        yield

    await engine.dispose()


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

v1_router = APIRouter(prefix="/api/v1")


class FileCreatedResponse(BaseModel):
    id: UUID


class FlashcardRequest(BaseModel):
    limit: int = 10


class FlashcardResponse(BaseModel):
    question: str
    answer: str


@v1_router.get("/files", response_model=List[FileSummary])
async def list_files(
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    uid = current_user["uid"]
    result = await db.execute(
        select(FileModel)
        .options(selectinload(FileModel.chunks))
        .where(FileModel.user_id == uid)
    )
    files = result.scalars().all()
    summaries = []
    for f in files:
        if f.chunks:
            text = f.chunks[0].content
            preview = text[:20] + ("..." if len(text) > 20 else "")
        else:
            preview = ""
        summaries.append(FileSummary(id=f.id, name=f.name, preview=preview))
    return summaries


@v1_router.post("/files", response_model=FileCreatedResponse, status_code=201)
async def create_file(
    response: Response,
    name: str = Form(...),
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user),
    http_client: httpx.AsyncClient = Depends(get_http_client),
):
    uid = current_user["uid"]
    file_content = await file.read()

    try:
        markitdown_response = await http_client.post(
            settings.markitdown_url,
            files={"file": (file.filename, file_content, file.content_type)},
        )
        markitdown_response.raise_for_status()
        markdown_text = markitdown_response.json().get("markdown", "")

        unstructured_response = await http_client.post(
            settings.unstructured_url,
            files={"files": ("doc.md", io.BytesIO(markdown_text.encode()))},
            data={
                "chunking_strategy": "by_title",
                "max_characters": "1000",
                "overlap": "150",
            },
        )
        unstructured_response.raise_for_status()
        elements = unstructured_response.json()

    except httpx.HTTPStatusError as e:
        raise HTTPException(
            status_code=502,
            detail=f"Errore servizio esterno ({e.response.status_code}): {e.request.url}",
        )
    except httpx.RequestError as e:
        raise HTTPException(
            status_code=503,
            detail=f"Servizio non raggiungibile: {e.request.url}",
        )

    new_file = FileModel(name=name, user_id=uid)
    db.add(new_file)
    await db.flush()

    db.add_all([
        ChunkModel(file_id=new_file.id, content=el["text"])
        for el in elements
        if "text" in el
    ])

    response.headers["Location"] = f"/api/v1/files/{new_file.id}"
    return FileCreatedResponse(id=new_file.id)


@v1_router.delete("/files/{file_id}", status_code=204)
async def delete_file(
    file_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    uid = current_user["uid"]
    result = await db.execute(
        select(FileModel).where(FileModel.id == file_id, FileModel.user_id == uid)
    )
    file_obj = result.scalars().first()
    if not file_obj:
        raise HTTPException(status_code=404, detail="File non trovato.")
    await db.delete(file_obj)
    return Response(status_code=204)


@v1_router.post(
    "/files/{file_id}/flashcards",
    response_model=List[FlashcardResponse],
)
async def generate_flashcards(
    file_id: UUID,
    req: FlashcardRequest,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user),
    http_client: httpx.AsyncClient = Depends(get_http_client),
):
    uid = current_user["uid"]
    file_result = await db.execute(
        select(FileModel).where(FileModel.id == file_id, FileModel.user_id == uid)
    )
    if not file_result.scalars().first():
        raise HTTPException(status_code=404, detail="File non trovato.")

    chunk_result = await db.execute(
        select(ChunkModel.content)
        .where(ChunkModel.file_id == file_id)
        .order_by(func.random())
        .limit(req.limit)
    )
    texts = chunk_result.scalars().all()

    if not texts:
        return []

    try:
        flashcard_response = await http_client.post(
            settings.flashcard_gen_url,
            json={"texts": texts},
        )
        flashcard_response.raise_for_status()
        return flashcard_response.json()

    except httpx.HTTPStatusError as e:
        raise HTTPException(
            status_code=502,
            detail=f"Errore generazione flashcard ({e.response.status_code})",
        )
    except httpx.RequestError:
        raise HTTPException(
            status_code=503,
            detail="Servizio di generazione flashcard non raggiungibile",
        )


app.include_router(v1_router)
