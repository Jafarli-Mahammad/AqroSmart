from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    DATABASE_URL: str = "postgresql+asyncpg://user:password@localhost:5432/aqrosmart"

    class Config:
        env_file = ".env"

settings = Settings()
