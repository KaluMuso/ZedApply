from pydantic import BaseModel, Field, EmailStr
from typing import Optional, Literal

class UserProfile(BaseModel):
    id: str
    phone: str
    full_name: Optional[str] = None
    email: Optional[EmailStr] = None
    location: Optional[str] = None
    years_experience: int = 0
    skills: list[str] = []
    cv_uploaded: bool = False
    subscription_tier: str = "free"
    role: str = "user"

class UserProfileUpdate(BaseModel):
    full_name: Optional[str] = Field(None, max_length=255)
    email: Optional[EmailStr] = None
    location: Optional[str] = Field(None, max_length=100)
    years_experience: Optional[int] = Field(None, ge=0)


class UserPreferences(BaseModel):
    whatsapp_alerts: bool = True
    language: Literal["en", "bem"] = "en"


class UserPreferencesUpdate(BaseModel):
    whatsapp_alerts: Optional[bool] = None
    language: Optional[Literal["en", "bem"]] = None


class ProfileDeleted(BaseModel):
    deleted: bool = True
    user_id: str


Proficiency = Literal["beginner", "intermediate", "advanced", "expert"]


class UserSkill(BaseModel):
    name: str
    proficiency: Proficiency = "intermediate"
    source: Literal["cv_parse", "manual", "assessment"] = "manual"


class UserSkillCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)
    proficiency: Proficiency = "intermediate"


class UserSkillUpdate(BaseModel):
    proficiency: Proficiency


class UserSkillsList(BaseModel):
    skills: list[UserSkill]
