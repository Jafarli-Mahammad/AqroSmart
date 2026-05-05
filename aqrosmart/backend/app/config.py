from pydantic_settings import BaseSettings
from pydantic import model_validator

class Settings(BaseSettings):
    DATABASE_URL: str = "postgresql+asyncpg://user:password@localhost:5432/aqrosmart"
    REDIS_URL: str = "redis://localhost:6379/0"
    SENTRY_DSN: str | None = None
    SENTRY_ENVIRONMENT: str = "development"
    CELERY_BROKER_URL: str | None = None
    CELERY_RESULT_BACKEND: str | None = None
    BACKEND_CORS_ORIGINS: str = "*"

    @model_validator(mode="after")
    def set_runtime_defaults(self):
        if not self.CELERY_BROKER_URL:
            self.CELERY_BROKER_URL = self.REDIS_URL
        if not self.CELERY_RESULT_BACKEND:
            self.CELERY_RESULT_BACKEND = self.REDIS_URL
        return self

    class Config:
        env_file = ".env"

settings = Settings()
