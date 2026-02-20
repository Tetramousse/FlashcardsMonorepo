import os
import io
import asyncio
import httpx
import firebase_admin
from typing import List
from fastapi import FastAPI, UploadFile, File, Form, HTTPException, Depends, APIRouter, status, Response
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from firebase_admin import credentials, auth as firebase_auth
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker, declarative_base
from sqlalchemy import Column, Integer, String, Text, ForeignKey, select, func, delete
from pydantic import BaseModel
from contextlib import asynccontextmanager

DATABASE_URL     = os.getenv("DATABASE_URL",     "postgresql+asyncpg://user:password@db/dbname")
MARKITDOWN_URL   = os.getenv("MARKITDOWN_URL",   "http://markitdown:8490/process_file")
UNSTRUCTURED_URL = os.getenv("UNSTRUCTURED_URL", "http://unstructured:8000/general/v0/general")
FLASHCARD_GEN_URL= os.getenv("FLASHCARD_GEN_URL","http://flashcard-gen:8000/generate")

_cred = credentials.Certificate(os.getenv("FIREBASE_CREDENTIALS_PATH", "serviceAccountKey.json"))
firebase_admin.initialize_app(_cred)

_bearer = HTTPBearer()

async def get_current_user(token: HTTPAuthorizationCredentials = Depends(_bearer)) -> dict:
    try:
        decoded = await asyncio.to_thread(firebase_auth.verify_id_token, token.credentials)
        return decoded
    except firebase_auth.ExpiredIdTokenError:
        raise HTTPException(status_code=401, detail="Token scaduto")
    except firebase_auth.InvalidIdTokenError:
        raise HTTPException(status_code=401, detail="Token non valido")
    except Exception:
        raise HTTPException(status_code=401, detail="Autenticazione fallita")


engine = create_async_engine(DATABASE_URL, echo=False)
AsyncSessionLocal = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
Base = declarative_base()


class FileModel(Base):
    __tablename__ = "files"
    id      = Column(Integer, primary_key=True, index=True)
    name    = Column(String, index=True)
    user_id = Column(String, index=True, nullable=False)


class ChunkModel(Base):
    __tablename__ = "chunks"
    id      = Column(Integer, primary_key=True, index=True)
    file_id = Column(Integer, ForeignKey("files.id"))
    content = Column(Text)


async def get_db():
    db = AsyncSessionLocal()
    try:
        yield db
    finally:
        await db.close()


app = FastAPI(title="FlashcardAPI")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@asynccontextmanager
async def lifespan(app: FastAPI):
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    yield

app = FastAPI(title="FlashcardAPI", lifespan=lifespan)


v1_router = APIRouter(prefix="/api/v1", tags=["Versione 1"])


class DeleteRequest(BaseModel):
    id: int

class FlashcardRequest(BaseModel):
    id: int
    limit: int = 10

class FlashcardResponse(BaseModel):
    question: str
    answer: str


@v1_router.post("/upload-file", status_code=status.HTTP_201_CREATED)
async def upload_file(
    response: Response,
    name: str = Form(...),
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    uid = current_user["uid"]
    file_content = await file.read()

    async with httpx.AsyncClient(timeout=120.0) as client:
        md_response = await client.post(
            MARKITDOWN_URL,
            files={"file": (file.filename, file_content, file.content_type)},
        )
        md_response.raise_for_status()
        markdown_text = md_response.json().get("markdown", "")

        us_response = await client.post(
            UNSTRUCTURED_URL,
            files={"files": ("response.md", io.BytesIO(markdown_text.encode("utf-8")))},
            data={"chunking_strategy": "by_title", "max_characters": "1000", "overlap": "150"},
        )
        us_response.raise_for_status()
        elements = us_response.json()

    new_file = FileModel(name=name, user_id=uid)
    db.add(new_file)
    await db.flush()

    db.add_all([
        ChunkModel(file_id=new_file.id, content=el.get("text", ""))
        for el in elements if "text" in el
    ])
    await db.commit()

    response.headers["Location"] = f"/api/v1/files/{new_file.id}"
    return {"id": new_file.id}


@v1_router.delete("/delete-file", status_code=status.HTTP_204_NO_CONTENT)
async def delete_file(
    req: DeleteRequest,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    uid = current_user["uid"]
    result = await db.execute(
        select(FileModel).where(FileModel.id == req.id, FileModel.user_id == uid)
    )
    file_obj = result.scalars().first()

    if not file_obj:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="File non trovato.")

    await db.execute(delete(ChunkModel).where(ChunkModel.file_id == req.id))
    await db.delete(file_obj)
    await db.commit()

    return Response(status_code=status.HTTP_204_NO_CONTENT)


@v1_router.post("/get-flashcards", response_model=List[FlashcardResponse], status_code=status.HTTP_200_OK)
async def get_flashcards(
    req: FlashcardRequest,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    uid = current_user["uid"]
    result_file = await db.execute(
        select(FileModel).where(FileModel.id == req.id, FileModel.user_id == uid)
    )
    if not result_file.scalars().first():
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="File non trovato.")

    result = await db.execute(
        select(ChunkModel.content)
        .where(ChunkModel.file_id == req.id)
        .order_by(func.random())
        .limit(req.limit)
    )
    texts = result.scalars().all()
    if not texts:
        return []

    async with httpx.AsyncClient(timeout=120.0) as client:
        gen_response = await client.post(
            FLASHCARD_GEN_URL,
            json={"texts": texts},
            headers={"Content-Type": "application/json"},
        )
        gen_response.raise_for_status()
        return gen_response.json()


app.include_router(v1_router)
