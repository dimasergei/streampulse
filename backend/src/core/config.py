from pydantic_settings import BaseSettings
from functools import lru_cache

class Settings(BaseSettings):
    # API Settings
    APP_NAME: str = "StreamPulse"
    VERSION: str = "1.0.0"
    DEBUG: bool = False
    API_PREFIX: str = "/api/v1"
    
    # Database
    DATABASE_URL: str = "postgresql://user:password@localhost:5432/streampulse"
    
    # Redis
    REDIS_URL: str = "redis://localhost:6379"
    CACHE_TTL: int = 3600
    
    # WebSocket
    WS_PORT: int = 8001
    
    # Processing
    MAX_BATCH_SIZE: int = 1000
    PROCESSING_INTERVAL: int = 1  # seconds
    MAX_CONCURRENT_REQUESTS: int = 100
    TIMEOUT_SECONDS: int = 30
    
    # Performance
    THROUGHPUT_TARGET: int = 5000  # events/second
    LATENCY_TARGET_P95: int = 50  # ms
    
    # Monitoring
    PROMETHEUS_PORT: int = 9090
    LOG_LEVEL: str = "INFO"
    
    # CORS
    ALLOWED_ORIGINS: list[str] = ["http://localhost:3000", "https://*.vercel.app"]
    
    # Dead Letter Queue
    DLQ_ENABLED: bool = True
    DLQ_MAX_RETRIES: int = 3
    DLQ_BACKOFF_BASE: float = 2.0
    
    class Config:
        env_file = ".env"
        case_sensitive = True

@lru_cache
def get_settings() -> Settings:
    return Settings()
