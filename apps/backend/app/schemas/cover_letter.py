"""Cover letter request/response schemas."""

from enum import Enum

from pydantic import BaseModel


class CoverLetterTone(str, Enum):
    formal = "formal"
    friendly = "friendly"
    confident = "confident"


class CoverLetterRequest(BaseModel):
    job_id: str
    tone: CoverLetterTone = CoverLetterTone.formal


class CoverLetterResponse(BaseModel):
    content: str
    word_count: int
