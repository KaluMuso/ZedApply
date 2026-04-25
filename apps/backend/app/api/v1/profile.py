"""User profile routes."""
from fastapi import APIRouter, Depends, HTTPException
from app.core.deps import get_supabase, get_current_user_id
from app.schemas.user import UserProfile, UserProfileUpdate

router = APIRouter(prefix="/profile", tags=["Profile"])


@router.get("", response_model=UserProfile)
async def get_profile(
    user_id: str = Depends(get_current_user_id),
    supabase=Depends(get_supabase),
):
    result = supabase.table("users").select("*").eq("id", user_id).single().execute()
    if not result.data:
        raise HTTPException(status_code=404, detail="User not found")

    user = result.data

    # Get user skills
    skills_result = (
        supabase.table("user_skills")
        .select("skills(name)")
        .eq("user_id", user_id)
        .execute()
    )
    skills = [s["skills"]["name"] for s in (skills_result.data or []) if s.get("skills")]

    # Check if user has a primary CV
    cv_result = (
        supabase.table("cvs")
        .select("id")
        .eq("user_id", user_id)
        .eq("is_primary", True)
        .limit(1)
        .execute()
    )
    cv_uploaded = bool(cv_result.data)

    return UserProfile(
        id=user["id"],
        phone=user["phone"],
        full_name=user.get("full_name"),
        email=user.get("email"),
        location=user.get("location"),
        years_experience=user.get("years_experience", 0),
        skills=skills,
        cv_uploaded=cv_uploaded,
        subscription_tier=user.get("subscription_tier", "mwana"),
        role=user.get("role", "user"),
    )


@router.patch("", response_model=UserProfile)
async def update_profile(
    body: UserProfileUpdate,
    user_id: str = Depends(get_current_user_id),
    supabase=Depends(get_supabase),
):
    update_data = body.model_dump(exclude_none=True)
    if not update_data:
        raise HTTPException(status_code=422, detail="No fields to update")

    supabase.table("users").update(update_data).eq("id", user_id).execute()

    # Return the updated profile by reusing get_profile logic
    return await get_profile(user_id=user_id, supabase=supabase)
