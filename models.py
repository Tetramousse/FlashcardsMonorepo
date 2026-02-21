import uuid
from sqlalchemy import ForeignKey, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, relationship
from pydantic import BaseModel


class Base(DeclarativeBase):
    pass


class FileModel(Base):
    __tablename__ = "files"
    
    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, index=True, default=uuid.uuid4)
    name: Mapped[str] = mapped_column(index=True)
    user_id: Mapped[str] = mapped_column(index=True)
    
    chunks: Mapped[list["ChunkModel"]] = relationship(back_populates="file", cascade="all, delete")


class ChunkModel(Base):
    __tablename__ = "chunks"
    
    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, index=True, default=uuid.uuid4)
    file_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("files.id", ondelete="CASCADE"))
    content: Mapped[str] = mapped_column(Text)
    
    file: Mapped["FileModel"] = relationship(back_populates="chunks")


class FileSummary(BaseModel):
    id: uuid.UUID
    name: str
    preview: str
