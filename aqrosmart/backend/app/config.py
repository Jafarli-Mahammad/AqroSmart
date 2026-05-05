from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    DATABASE_URL: str = "postgresql+asyncpg://user:password@localhost:5432/aqrosmart"
    REDIS_URL: str = "redis://localhost:6379/0"
    SENTRY_DSN: str | None = None
    SENTRY_ENVIRONMENT: str = "development"
    CELERY_BROKER_URL: str = "redis://localhost:6379/0"
    CELERY_RESULT_BACKEND: str = "redis://localhost:6379/1"

    class Config:
        env_file = ".env"

settings = Settings()
