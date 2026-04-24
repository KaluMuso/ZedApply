"""User profile routes."""

from fastapi import APIRouter, Depends, HTTPException, status

from app.core.deps import get_current_user_id, get_supabase
from app.schemas.user import UserProfile, UserProfileUpdate

router = APIRouter(prefix="/profile", tags=["Profile"])


@router.get("", response_model=UserProfile)
async def get_profile(
    user_id: str = Depends(get_current_user_id),
    supabase=Depends(get_supabase),
):
    user_result = (
        supabase.table("users")
        .select("id,phone,full_name,email,location,years_experience,subscription_tier,created_at")
        .eq("id", user_id)
        .single()
        .execute()
    )
    if not user_result.data:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

    skills_result = (
        supabase.table("user_skills")
        .select("skills(name)")
        .eq("user_id", user_id)
        .execute()
    )

    skills: list[str] = []
    for row in skills_result.data or []:
        skill = row.get("skills") or {}
        name = skill.get("name")
        if isinstance(name, str) and name:
            skills.append(name)

    user = user_result.data
    return UserProfile(
        id=user["id"],
        phone=user["phone"],
        full_name=user.get("full_name"),
        email=user.get("email"),
        location=user.get("location"),
        years_experience=int(user.get("years_experience") or 0),
        skills=sorted(set(skills)),
        subscription_tier=str(user.get("subscription_tier") or "mwana"),
        created_at=user["created_at"],
    )


@router.patch("", response_model=UserProfile)
async def update_profile(
    body: UserProfileUpdate,
    user_id: str = Depends(get_current_user_id),
    supabase=Depends(get_supabase),
):
    update_payload = {k: v for k, v in body.model_dump(exclude_none=True).items()}
    if not update_payload:
        return await get_profile(user_id=user_id, supabase=supabase)

    supabase.table("users").update(update_payload).eq("id", user_id).execute()

    return await get_profile(user_id=user_id, supabase=supabase)
