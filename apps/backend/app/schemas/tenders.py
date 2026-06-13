"""Tenders schema definitions."""
from datetime import datetime
from pydantic import BaseModel


class TenderCreate(BaseModel):
    procuring_entity: str
    title: str
    category: str
    description: str | None = None
    requirements: str | None = None
    closing_date: datetime
    province: str = "National"
    source_url: str | None = None


class TenderIngestRequest(BaseModel):
    tenders: list[TenderCreate]


class TenderIngestErrorItem(BaseModel):
    index: int
    title: str
    reason: str


class TenderIngestResponse(BaseModel):
    ingested: int
    duplicates: int
    errors: list[TenderIngestErrorItem]
