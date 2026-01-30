from fastapi import FastAPI, Request, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware
from fastapi.responses import JSONResponse
from contextlib import asynccontextmanager
import time
import asyncio
import redis.asyncio as redis
import structlog

from src.core.config import get_settings
from src.core.logging import setup_logging
from src.core.exceptions import StreamPulseException
from src.ingestion.stream_processor import StreamProcessor
from src.services.worker import EventWorker
from src.services.websocket_manager import WebSocketManager
from src.monitoring.metrics import MetricsCollector
from src.api.routes import events, websocket, health

# Configure logging
setup_logging()
logger = structlog.get_logger()

settings = get_settings()

# Global instances
redis_client: redis.Redis = None
metrics_collector: MetricsCollector = None
stream_processor: StreamProcessor = None
event_worker: EventWorker = None
websocket_manager: WebSocketManager = None

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan manager"""
    # Startup
    logger.info("starting_streampulse", version=settings.VERSION)
    
    # Initialize Redis
    global redis_client, metrics_collector, stream_processor, event_worker, websocket_manager
    redis_client = redis.from_url(settings.REDIS_URL, decode_responses=True)
    
    # Initialize services
    metrics_collector = MetricsCollector(redis_client)
    stream_processor = StreamProcessor(redis_client)
    event_worker = EventWorker(redis_client, metrics_collector)
    websocket_manager = WebSocketManager(redis_client, metrics_collector)
    
    # Set global instances for routes
    events.redis_client = redis_client
    events.metrics_collector = metrics_collector
    events.stream_processor = stream_processor
    events.event_worker = event_worker
    
    websocket.websocket_manager = websocket_manager
    websocket.metrics_collector = metrics_collector
    
    health.redis_client = redis_client
    health.event_worker = event_worker
    health.websocket_manager = websocket_manager
    health.metrics_collector = metrics_collector
    
    # Start background services
    worker_task = asyncio.create_task(event_worker.start())
    broadcast_task = asyncio.create_task(websocket_manager.start_broadcast_loop())
    
    logger.info("streampulse_started", services_initialized=True)
    
    yield
    
    # Shutdown
    logger.info("shutting_down_streampulse")
    
    # Stop background services
    await event_worker.stop()
    await websocket_manager.stop_broadcast_loop()
    
    # Cancel tasks
    worker_task.cancel()
    broadcast_task.cancel()
    
    # Close Redis
    await redis_client.close()

# Create FastAPI app
app = FastAPI(
    title=settings.APP_NAME,
    version=settings.VERSION,
    description="Real-time analytics platform",
    lifespan=lifespan,
    docs_url="/docs" if settings.DEBUG else None,
    redoc_url="/redoc" if settings.DEBUG else None,
)

# Add middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.add_middleware(GZipMiddleware, minimum_size=1000)

@app.middleware("http")
async def add_process_time_header(request: Request, call_next):
    """Add request timing and logging"""
    start_time = time.perf_counter()
    
    try:
        response = await call_next(request)
        process_time = time.perf_counter() - start_time
        response.headers["X-Process-Time"] = str(process_time)
        
        # Log request
        logger.info(
            "request_completed",
            method=request.method,
            url=str(request.url),
            status_code=response.status_code,
            process_time=process_time
        )
        
        return response
        
    except Exception as e:
        process_time = time.perf_counter() - start_time
        logger.error(
            "request_failed",
            method=request.method,
            url=str(request.url),
            error=str(e),
            process_time=process_time
        )
        raise

@app.exception_handler(StreamPulseException)
async def streampulse_exception_handler(request: Request, exc: StreamPulseException):
    """Handle StreamPulse-specific exceptions"""
    logger.error(
        "streampulse_exception",
        error=exc.message,
        details=exc.details,
        url=str(request.url)
    )
    return JSONResponse(
        status_code=500,
        content={
            "error": "StreamPulse processing failed",
            "message": exc.message,
            "details": exc.details
        }
    )

@app.exception_handler(HTTPException)
async def http_exception_handler(request: Request, exc: HTTPException):
    """Handle HTTP exceptions"""
    logger.warning(
        "http_exception",
        status_code=exc.status_code,
        detail=exc.detail,
        url=str(request.url)
    )
    return JSONResponse(
        status_code=exc.status_code,
        content={"error": exc.detail}
    )

@app.exception_handler(Exception)
async def general_exception_handler(request: Request, exc: Exception):
    """Handle unexpected exceptions"""
    logger.error(
        "unexpected_exception",
        error=str(exc),
        url=str(request.url),
        exc_info=True
    )
    return JSONResponse(
        status_code=500,
        content={"error": "Internal server error"}
    )

# Include routers
app.include_router(
    events.router,
    prefix=f"{settings.API_PREFIX}/events",
    tags=["events"]
)

app.include_router(
    websocket.router,
    prefix=f"{settings.API_PREFIX}/ws",
    tags=["websocket"]
)

app.include_router(
    health.router,
    tags=["health"]
)

@app.get("/")
async def root():
    """Root endpoint"""
    return {
        "name": settings.APP_NAME,
        "version": settings.VERSION,
        "status": "running",
        "docs": "/docs" if settings.DEBUG else "disabled",
        "websocket": f"/api/v1/ws/ws"
    }

@app.get(f"{settings.API_PREFIX}/info")
async def app_info():
    """Application information"""
    return {
        "name": settings.APP_NAME,
        "version": settings.VERSION,
        "debug": settings.DEBUG,
        "throughput_target": settings.THROUGHPUT_TARGET,
        "latency_target": settings.LATENCY_TARGET_P95,
        "max_batch_size": settings.MAX_BATCH_SIZE,
        "dlq_enabled": settings.DLQ_ENABLED,
        "dlq_max_retries": settings.DLQ_MAX_RETRIES
    }
