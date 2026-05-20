from datetime import datetime

from pydantic import BaseModel


class SavedJobEntry(BaseModel):
    job_id: str
    saved_at: datetime


class SavedJobList(BaseModel):
    job_ids: list[str]
