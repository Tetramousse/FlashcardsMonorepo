import uuid
from pydantic import BaseModel


class FileSummary(BaseModel):
    id: uuid.UUID
    name: str
    preview: str