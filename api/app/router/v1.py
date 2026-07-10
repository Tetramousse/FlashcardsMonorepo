import io
import asyncio
import httpx
import logging
from uuid import UUID
from typing import List, Optional

from fastapi import (
    APIRouter,
    UploadFile,
    File,
    Form,
    HTTPException,
    Depends,
    Request,
    Response,
)
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload
from sqlalchemy import select, func
from pydantic import BaseModel

from app.models.db import FileModel, ChunkModel
from app.models.schemas import FileSummary
from app.config import get_settings
from app.dependencies import get_db, get_current_user

logger = logging.getLogger("flashcard_api")
settings = get_settings()


def get_http_client(request: Request) -> httpx.AsyncClient:
    return request.app.state.http_client


class FileCreatedResponse(BaseModel):
    id: UUID


class FlashcardRequest(BaseModel):
    limit: int = 10


class FlashcardResponse(BaseModel):
    question: str
    answer: str


v1_router = APIRouter(prefix="/api/v1")


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
        .join(FileModel, ChunkModel.file_id == FileModel.id)
        .where(ChunkModel.file_id == file_id, FileModel.user_id == uid)
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
