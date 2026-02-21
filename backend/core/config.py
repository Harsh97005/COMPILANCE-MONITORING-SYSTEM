from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    # Use SQLite for local testing if Postgres is unavailable
    DATABASE_URL: str = "sqlite:///./compliance.db"
    REDIS_URL: str = "redis://localhost:6379/0"
    SECRET_KEY: str = "09d25e094faa6ca2556c818166b7a9563b93f7099f6f0f4caa6cf63b88e8d3e7"
    ALGORITHM: str = "HS256"

    class Config:
        env_file = ".env"

settings = Settings()
