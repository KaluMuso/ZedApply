"""CV upload and generation routes."""
from fastapi import APIRouter, Depends, HTTPException, Request, UploadFile, File
from app.core.deps import get_supabase, get_current_user_id
from app.core.rate_limit import limiter
from app.services.cv_parser import extract_text_from_file, parse_cv_with_llm
from app.services.embedding import generate_embedding

router = APIRouter(prefix="/cv", tags=["CV"])

ALLOWED_TYPES = {
    "application/pdf": "pdf",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "docx",
    "image/jpeg": "jpg",
    "image/png": "png",
}
MAX_FILE_SIZE = 5 * 1024 * 1024


@router.post("/upload")
@limiter.limit("5/minute")
async def upload_cv(request: Request, file: UploadFile = File(...), user_id: str = Depends(get_current_user_id), supabase=Depends(get_supabase)):
    content_type = file.content_type or ""
    if content_type not in ALLOWED_TYPES:
        raise HTTPException(status_code=422, detail=f"Unsupported file type: {content_type}. Accepted: PDF, DOCX, JPG, PNG")
    file_type = ALLOWED_TYPES[content_type]

    file_bytes = await file.read()
    if len(file_bytes) > MAX_FILE_SIZE:
        raise HTTPException(status_code=422, detail="File too large. Maximum 5MB.")

    try:
        raw_text = await extract_text_from_file(file_bytes, file_type)
    except ValueError as e:
        raise HTTPException(status_code=503, detail=str(e))
    if not raw_text or len(raw_text.strip()) < 50:
        raise HTTPException(status_code=422, detail="Could not extract enough text. Please upload a clearer document.")

    try:
        parsed = await parse_cv_with_llm(raw_text)
    except ValueError as e:
        raise HTTPException(status_code=503, detail=str(e))

    try:
        embedding = await generate_embedding(raw_text)
    except ValueError as e:
        raise HTTPException(status_code=503, detail=str(e))

    storage_path = f"cvs/{user_id}/{file.filename}"
    supabase.storage.from_("documents").upload(storage_path, file_bytes, {"content-type": content_type})

    supabase.table("cvs").update({"is_primary": False}).eq("user_id", user_id).eq("is_primary", True).execute()

    result = supabase.table("cvs").insert({
        "user_id": user_id, "file_url": storage_path, "file_type": file_type,
        "raw_text": raw_text[:10000], "parsed_data": parsed, "embedding": embedding,
        "parsing_confidence": parsed.get("confidence", 0), "is_primary": True,
    }).execute()
    if not result.data:
        raise HTTPException(status_code=500, detail="Failed to store CV")
    cv_id = result.data[0]["id"]

    for skill_name in parsed.get("skills", []):
        skill_result = supabase.table("skills").select("id").eq("name", skill_name.lower()).limit(1).execute()
        skill_id = skill_result.data[0]["id"] if skill_result.data else None
        if not skill_id:
            alias = supabase.table("skill_aliases").select("skill_id").eq("alias", skill_name.lower()).limit(1).execute()
            skill_id = alias.data[0]["skill_id"] if alias.data else None
        if skill_id:
            supabase.table("user_skills").upsert({"user_id": user_id, "skill_id": skill_id, "source": "cv_parse"}, on_conflict="user_id,skill_id").execute()

    profile_update = {}
    for field in ["full_name", "email", "location"]:
        if parsed.get(field):
            profile_update[field] = parsed[field]
    if parsed.get("years_experience") is not None:
        profile_update["years_experience"] = parsed["years_experience"]
    if profile_update:
        supabase.table("users").update(profile_update).eq("id", user_id).execute()

    return {"cv_id": cv_id, "parsed_skills": parsed.get("skills", []), "experience_summary": parsed.get("experience_summary", ""), "parsing_confidence": parsed.get("confidence", 0)}
