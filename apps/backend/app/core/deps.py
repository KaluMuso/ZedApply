"""Shared FastAPI dependencies."""
from functools import lru_cache
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from jose import jwt, JWTError
from supabase import create_client, Client
from app.core.config import get_settings, Settings

security = HTTPBearer()


@lru_cache(maxsize=1)
def get_supabase() -> Client:
    """Cached Supabase client — single instance reused across all requests."""
    settings = get_settings()
    return create_client(settings.supabase_url, settings.supabase_key)


async def get_current_user_id(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    settings: Settings = Depends(get_settings),
) -> str:
    try:
        payload = jwt.decode(credentials.credentials, settings.jwt_secret, algorithms=[settings.jwt_algorithm])
        user_id: str | None = payload.get("sub")
        if user_id is None:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token: missing subject")
        return user_id
    except JWTError as e:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail=f"Invalid token: {str(e)}")


async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    settings: Settings = Depends(get_settings),
    supabase: Client = Depends(get_supabase),
) -> dict:
    """Return full user dict including role. Use this when you need role checks."""
    try:
        payload = jwt.decode(credentials.credentials, settings.jwt_secret, algorithms=[settings.jwt_algorithm])
        user_id: str | None = payload.get("sub")
        if user_id is None:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token")
    except JWTError as e:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail=f"Invalid token: {str(e)}")

    result = supabase.table("users").select("id, phone, role").eq("id", user_id).limit(1).execute()
    if not result.data:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found")

    return result.data[0]


def is_superadmin(user: dict) -> bool:
    """Check if user has superadmin role."""
    return user.get("role") == "superadmin"


async def require_superadmin(current_user: dict = Depends(get_current_user)) -> dict:
    """Dependency that 403s if the caller is not a superadmin."""
    if not is_superadmin(current_user):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Superadmin only")
    return current_user
