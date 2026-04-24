"""Cover letter generation route."""

from fastapi import APIRouter, Depends, HTTPException, status

from app.core.deps import get_current_user_id, get_supabase
from app.schemas.cover_letter import CoverLetterRequest, CoverLetterResponse
from app.services.cover_letter import generate_cover_letter

router = APIRouter(prefix="/cover-letter", tags=["Cover Letter"])


@router.post("/generate", response_model=CoverLetterResponse)
async def generate_cover_letter_endpoint(
    body: CoverLetterRequest,
    user_id: str = Depends(get_current_user_id),
    supabase=Depends(get_supabase),
):
    """Generate a cover letter for a job; requires Bwino tier."""
    subscription = (
        supabase.table("subscriptions")
        .select("tier,status")
        .eq("user_id", user_id)
        .order("created_at", desc=True)
        .limit(1)
        .execute()
    )

    if not subscription.data:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Active subscription required",
        )

    sub = subscription.data[0]
    if sub.get("status") != "active" or sub.get("tier") != "bwino":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Bwino tier required for cover letter generation",
        )

    cv_result = (
        supabase.table("cvs")
        .select("id,raw_text")
        .eq("user_id", user_id)
        .eq("is_primary", True)
        .order("created_at", desc=True)
        .limit(1)
        .execute()
    )
    if not cv_result.data:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Upload a CV first before generating a cover letter",
        )

    user_cv = cv_result.data[0]
    cv_text = user_cv.get("raw_text", "")
    if not cv_text.strip():
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Primary CV has no extracted text",
        )

    job_result = (
        supabase.table("jobs")
        .select("id,description,title,company")
        .eq("id", body.job_id)
        .eq("is_active", True)
        .limit(1)
        .execute()
    )
    if not job_result.data:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Job not found")

    job = job_result.data[0]
    job_description = job.get("description", "")
    if not job_description.strip():
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Selected job has no description",
        )

    generated = await generate_cover_letter(
        user_cv_text=cv_text,
        job_description=job_description,
        tone=body.tone.value,
    )

    supabase.table("generated_documents").insert(
        {
            "user_id": user_id,
            "job_id": body.job_id,
            "doc_type": "cover_letter",
            "content": generated["content"],
            "metadata": {
                "tone": body.tone.value,
                "word_count": generated["word_count"],
                "cv_id": user_cv["id"],
                "job_title": job.get("title"),
                "company": job.get("company"),
            },
        }
    ).execute()

    return CoverLetterResponse(
        content=str(generated["content"]),
        word_count=int(generated["word_count"]),
    )
