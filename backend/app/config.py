from functools import lru_cache

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    app_name: str = "Finance Management Platform"
    environment: str = "development"
    database_url: str = Field(default="sqlite:///./finance.db", alias="DATABASE_URL")
    secret_key: str = Field(default="dev-secret-key-change-me", alias="SECRET_KEY")
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

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    @property
    def is_production(self) -> bool:
        return self.environment.lower() == "production"


@lru_cache
def get_settings() -> Settings:
    return Settings()
