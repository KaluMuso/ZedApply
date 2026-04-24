"""CV parsing via OpenRouter (google/gemini-flash-2.0).

OpenRouter exposes an OpenAI-compatible API, so we use the openai SDK
pointed at https://openrouter.ai/api/v1.
"""
import io
import json
import base64
import asyncio
import logging
from typing import Any
from functools import lru_cache

from openai import OpenAI, AuthenticationError, RateLimitError, APIError
from PyPDF2 import PdfReader
from docx import Document

from app.core.config import get_settings

logger = logging.getLogger(__name__)

# ── System prompts ──
CV_PARSE_SYSTEM_PROMPT = """You are a CV/resume parser for the Zambian job market.
Extract structured information from CV text and return ONLY valid JSON.

Required fields:
- full_name (string)
- email (string or null)
- phone (string or null, format as +260XXXXXXXXX if Zambian)
- location (string or null, city/province in Zambia if applicable)
- years_experience (integer, estimate from work history dates)
- skills (array of lowercase strings, normalized — "javascript" not "JS", "microsoft office" not "MS Word")
- experience_summary (string, 1-2 sentences)
- education (array of strings, highest qualification first)
- confidence (float 0-1, how confident you are in the extraction)

Zambia-specific rules:
- Recognize Zambian universities: UNZA, CBU, Mulungushi, Cavendish, ZCAS, DMI
- Recognize Zambian cities: Lusaka, Kitwe, Ndola, Livingstone, Kabwe, Chipata, Solwezi, Kasama
- Normalize phone numbers to +260 format
- Map local qualifications: Grade 12 = High School, Diploma, Advanced Diploma, Bachelor's, Master's, PhD"""

OCR_SYSTEM_PROMPT = """You are an OCR specialist for the Zambian job market.
Extract ALL text from images of CVs, resumes, or job postings.
Preserve structure: headings, bullet points, dates, contact info.
Return only the extracted text, nothing else."""


@lru_cache(maxsize=1)
def _get_openrouter_client() -> OpenAI:
    """OpenRouter uses the OpenAI SDK — just change the base_url."""
    settings = get_settings()
    return OpenAI(
        api_key=settings.openrouter_api_key,
        base_url="https://openrouter.ai/api/v1",
    )


async def extract_text_from_file(file_bytes: bytes, file_type: str) -> str:
    """Extract raw text from PDF, DOCX, or image files."""
    if file_type == "pdf":
        reader = PdfReader(io.BytesIO(file_bytes))
        return "\n".join(page.extract_text() or "" for page in reader.pages)

    elif file_type == "docx":
        doc = Document(io.BytesIO(file_bytes))
        return "\n".join(para.text for para in doc.paragraphs)

    elif file_type in ("jpg", "png", "jpeg"):
        return await _ocr_with_vision(file_bytes, file_type)

    raise ValueError(f"Unsupported file type: {file_type}")


async def parse_cv_with_llm(raw_text: str) -> dict[str, Any]:
    """Parse CV text into structured data using Gemini Flash via OpenRouter."""
    settings = get_settings()
    client = _get_openrouter_client()

    def _call():
        try:
            response = client.chat.completions.create(
                model=settings.llm_model,
                max_tokens=1024,
                messages=[
                    {"role": "system", "content": CV_PARSE_SYSTEM_PROMPT},
                    {
                        "role": "user",
                        "content": f"Parse this CV and return JSON:\n\n{raw_text[:8000]}",
                    },
                ],
                response_format={"type": "json_object"},
            )

            text = response.choices[0].message.content
            # Clean markdown fences if model wraps output
            if "```json" in text:
                text = text.split("```json")[1].split("```")[0]
            elif "```" in text:
                text = text.split("```")[1].split("```")[0]

            return json.loads(text.strip())

        except AuthenticationError:
            logger.error("OpenRouter API key is invalid or missing")
            raise ValueError("CV parsing service is not configured. Please contact support.")
        except RateLimitError:
            logger.warning("OpenRouter rate limit hit during CV parsing")
            raise ValueError("CV parsing is temporarily busy. Please try again in a minute.")
        except APIError as e:
            logger.error(f"OpenRouter API error during CV parsing: {e}")
            raise ValueError("CV parsing service is temporarily unavailable. Please try again later.")
        except json.JSONDecodeError:
            logger.error("Failed to parse LLM response as JSON")
            raise ValueError("Could not parse your CV. Please try uploading a clearer document.")

    return await asyncio.to_thread(_call)


async def _ocr_with_vision(image_bytes: bytes, file_type: str) -> str:
    """OCR via Gemini Flash vision capabilities through OpenRouter."""
    settings = get_settings()
    client = _get_openrouter_client()
    media_type = f"image/{'jpeg' if file_type in ('jpg', 'jpeg') else 'png'}"
    b64_image = base64.b64encode(image_bytes).decode("utf-8")

    def _call():
        try:
            response = client.chat.completions.create(
                model=settings.llm_model,
                max_tokens=2048,
                messages=[
                    {"role": "system", "content": OCR_SYSTEM_PROMPT},
                    {
                        "role": "user",
                        "content": [
                            {
                                "type": "image_url",
                                "image_url": {
                                    "url": f"data:{media_type};base64,{b64_image}"
                                },
                            },
                            {"type": "text", "text": "Extract ALL text from this image."},
                        ],
                    },
                ],
            )

            return response.choices[0].message.content

        except AuthenticationError:
            logger.error("OpenRouter API key is invalid for OCR")
            raise ValueError("Image processing service is not configured.")
        except APIError as e:
            logger.error(f"OpenRouter API error during OCR: {e}")
            raise ValueError("Image processing failed. Please try uploading a PDF or Word document instead.")

    return await asyncio.to_thread(_call)
