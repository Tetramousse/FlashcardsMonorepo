from sqlalchemy import ForeignKey, Text
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, relationship

class Base(DeclarativeBase):
    pass

class FileModel(Base):
    __tablename__ = "files"
    
    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    name: Mapped[str] = mapped_column(index=True)
    user_id: Mapped[str] = mapped_column(index=True)
    
    chunks: Mapped[list["ChunkModel"]] = relationship(back_populates="file", cascade="all, delete")

class ChunkModel(Base):
    __tablename__ = "chunks"
    
    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    file_id: Mapped[int] = mapped_column(ForeignKey("files.id", ondelete="CASCADE"))
    content: Mapped[str] = mapped_column(Text)
    
    file: Mapped["FileModel"] = relationship(back_populates="chunks")