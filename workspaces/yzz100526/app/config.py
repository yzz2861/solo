from pydantic_settings import BaseSettings
from datetime import timedelta


class Settings(BaseSettings):
    API_V1_PREFIX: str = "/api/v1"
    PROJECT_NAME: str = "城市书报亭补刊服务"
    
    DATABASE_URL: str = "sqlite:///./newsstand.db"
    
    RETURN_DEADLINE_DAYS: int = 15
    
    MERGE_PENDING_HOURS: int = 4
    
    class Config:
        case_sensitive = True


settings = Settings()
