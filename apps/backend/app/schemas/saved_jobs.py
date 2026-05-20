"""Saved jobs API models."""

from pydantic import BaseModel

from app.schemas.jobs import Job


class SavedJobsList(BaseModel):
    jobs: list[Job]


class SaveJobResponse(BaseModel):
    saved: bool = True
