"""Rate limiter instance shared across routes.

Usage in route files:
    from app.core.rate_limit import limiter

    @router.post("/endpoint")
    @limiter.limit("5/minute")
    async def my_endpoint(request: Request, ...):
        ...

Note: The `request: Request` parameter is required by slowapi
even if FastAPI doesn't need it for the route logic.
"""
from slowapi import Limiter
from slowapi.util import get_remote_address

limiter = Limiter(key_func=get_remote_address, default_limits=["200/minute"])
