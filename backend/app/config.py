from functools import lru_cache

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict

# Checked into this public repo (Security_Design.md section 3 discloses it as
# a placeholder), so a production deploy that forgets to set SECRET_KEY would
# otherwise sign every JWT with a secret anyone can read -- full auth bypass
# (forge an access token for any user id, admin included). get_settings()
# below fails closed on this the same way app/database.py already fails
# closed on a sqlite DATABASE_URL in production.
_DEFAULT_SECRET_KEY = "dev-secret-key-change-me"


class Settings(BaseSettings):
    app_name: str = "Finance Management Platform"
    environment: str = "development"
    database_url: str = Field(default="sqlite:///./finance.db", alias="DATABASE_URL")
    secret_key: str = Field(default=_DEFAULT_SECRET_KEY, alias="SECRET_KEY")
    algorithm: str = "HS256"
    access_token_expire_minutes: int = 60
    refresh_token_expire_days: int = 7

    stripe_secret_key: str = Field(default="", alias="STRIPE_SECRET_KEY")
    stripe_webhook_secret: str = Field(default="", alias="STRIPE_WEBHOOK_SECRET")
    stripe_price_id: str = Field(default="", alias="STRIPE_PRICE_ID")
    stripe_trial_days: int = Field(default=14, alias="STRIPE_TRIAL_DAYS")
    stripe_plan_amount_cents: int = Field(default=999, alias="STRIPE_PLAN_AMOUNT_CENTS")
    stripe_plan_currency: str = Field(default="usd", alias="STRIPE_PLAN_CURRENCY")
    billing_grace_period_days: int = Field(default=7, alias="BILLING_GRACE_PERIOD_DAYS")
    frontend_base_url: str = Field(default="http://localhost:5173", alias="FRONTEND_BASE_URL")
    # Comma-separated list, e.g. "https://app.example.com,https://admin.example.com".
    # Empty in production means CORS fails closed (see main.py) rather than
    # falling back to a wildcard -- there is no safe default origin to guess.
    allowed_origins: str = Field(default="", alias="ALLOWED_ORIGINS")

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    @property
    def is_production(self) -> bool:
        return self.environment.lower() == "production"

    @property
    def cors_allow_origins(self) -> list[str]:
        origins = [o.strip() for o in self.allowed_origins.split(",") if o.strip()]
        if self.is_production:
            return origins
        # Dev/test convenience only -- never reached in production, where an
        # empty ALLOWED_ORIGINS correctly yields zero allowed origins above.
        return origins or ["*"]


@lru_cache
def get_settings() -> Settings:
    settings = Settings()
    if settings.is_production and settings.secret_key == _DEFAULT_SECRET_KEY:
        raise RuntimeError(
            "Production environment requires a real SECRET_KEY (the default dev value is public in this repo)."
        )
    return settings
