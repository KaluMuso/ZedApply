"""Application configuration loaded from environment variables."""

from pydantic_settings import BaseSettings
from functools import lru_cache


class Settings(BaseSettings):
    """All settings are loaded from .env or environment variables."""

    # App
    app_name: str = "Zed CV API"
    app_version: str = "0.1.0"
    debug: bool = False

    # Supabase
    supabase_url: str
    supabase_anon_key: str
    supabase_service_key: str

    # OpenAI (embeddings)
    openai_api_key: str

    # Anthropic (CV parsing, cover letters)
    anthropic_api_key: str = ""

    # Public app URL (DPO redirect/back, Lenco “no browser URL” fallback)
    app_public_url: str = "https://zedcv.vercel.app"

    # DPO Pay — https://docs.dpopay.com/dpo-pay-by-network/reference/dpo-pay-api-v6
    dpo_pay_company_token: str = ""
    dpo_pay_service_type: str = ""
    dpo_pay_api_url: str = "https://secure.3gdirectpay.com/API/v6/"
    dpo_pay_checkout_url: str = "https://secure.3gdirectpay.com/payv2.php"
    dpo_pay_redirect_url: str = ""
    dpo_pay_back_url: str = ""
    payment_provider: str = "dpo_pay"

    # Lenco — base is `https://api.lenco.co` + `/access/v2` (see Lenco SDK / readme)
    lenco_secret_key: str = ""
    lenco_api_url: str = "https://api.lenco.co/access/v2"
    # POST initiate mobile-money collection; GET verify uses `collections/{id}` or `collections/status/{ref}`
    lenco_checkout_path: str = "collections/mobile-money"
    lenco_verify_path: str = "collections"
    lenco_verify_status_prefix: str = "collections/status"
    lenco_webhook_skip_verify: bool = False

    # WAHA (WhatsApp)
    # Default to a non-3000 port so local Next.js (typically :3000) does not collide.
    waha_api_url: str = "http://localhost:3001"
    waha_api_key: str = ""

    # JWT
    jwt_secret: str
    jwt_algorithm: str = "HS256"
    jwt_expire_minutes: int = 1440  # 24 hours
    jwt_refresh_expire_days: int = 30

    # Matching
    embedding_model: str = "text-embedding-3-small"
    embedding_dimensions: int = 1536
    min_match_score: float = 50.0

    # Rate limits
    otp_cooldown_seconds: int = 60
    max_otp_attempts: int = 5

    model_config = {"env_file": ".env", "env_file_encoding": "utf-8"}


@lru_cache
def get_settings() -> Settings:
    return Settings()
