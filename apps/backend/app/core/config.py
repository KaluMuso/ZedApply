"""Application configuration from environment variables."""
from pydantic_settings import BaseSettings
from functools import lru_cache


class Settings(BaseSettings):
    app_name: str = "Zed CV API"
    app_version: str = "0.1.0"
    debug: bool = False

    # ── Supabase ──
    supabase_url: str
    supabase_key: str  # service_role key for backend

    # ── AI: Embeddings (Google Gemini) ──
    gemini_api_key: str
    embedding_model: str = "text-embedding-004"
    embedding_dimensions: int = 768

    # ── AI: LLM via OpenRouter ──
    openrouter_api_key: str = ""
    llm_model: str = "google/gemini-flash-2.0"

    # ── Payments ──
    dpo_pay_company_token: str = ""
    dpo_pay_service_type: str = ""
    dpo_pay_api_url: str = "https://secure.3gdirectpay.com/API/v6/"
    lenco_api_key: str = ""
    lenco_api_url: str = "https://api.lenco.co/access/v1"

    # ── WhatsApp (WAHA) ──
    waha_api_url: str = "http://localhost:3001"
    waha_api_key: str = ""

    # ── Auth ──
    jwt_secret: str
    jwt_algorithm: str = "HS256"
    jwt_expire_minutes: int = 1440

    # ── Matching ──
    min_match_score: float = 50.0

    # ── OTP ──
    otp_cooldown_seconds: int = 60
    max_otp_attempts: int = 5

    # ── Superadmin phone (initial bootstrap) ──
    superadmin_phone: str = ""

    # ── Email (Resend) ──
    resend_api_key: str = ""
    resend_from_email: str = "Zed CV <noreply@zedcv.com>"
    app_url: str = "https://zedcv.com"

    model_config = {"env_file": ".env", "env_file_encoding": "utf-8"}


@lru_cache
def get_settings() -> Settings:
    return Settings()
