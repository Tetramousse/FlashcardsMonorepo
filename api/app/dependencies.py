import asyncio
from typing import Optional

from fastapi import HTTPException, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from firebase_admin import auth as firebase_auth
from sqlalchemy.ext.asyncio import AsyncSession, AsyncEngine, create_async_engine
from sqlalchemy.orm import sessionmaker

from api.app.config import get_settings

settings = get_settings()

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


def init_db():
    """Initialize database engine and session factory."""
    global engine, AsyncSessionLocal
    engine = create_async_engine(settings.database_url, echo=False)
    AsyncSessionLocal = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)


def create_base_tables():
    """Create all database tables."""
    from api.app.models.db import Base
    asyncio.run(engine.run_sync(Base.metadata.create_all))
