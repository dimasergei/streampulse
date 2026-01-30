from fastapi import APIRouter, Depends
from pydantic import BaseModel
from typing import Dict, Any, Optional
import time
import asyncio
import redis.asyncio as redis

from src.core.config import get_settings
from src.services.worker import EventWorker
from src.services.websocket_manager import WebSocketManager
from src.monitoring.metrics import MetricsCollector

router = APIRouter()
settings = get_settings()

# Global instances (initialized in main.py)
redis_client: redis.Redis = None
event_worker: EventWorker = None
websocket_manager: WebSocketManager = None
metrics_collector: MetricsCollector = None

class HealthCheckResponse(BaseModel):
    status: str
    version: str
    timestamp: float
    uptime: float
    services: Dict[str, Dict[str, Any]]

class DetailedHealthResponse(BaseModel):
    status: str
    version: str
    timestamp: float
    uptime: float
    services: Dict[str, Dict[str, Any]]
    metrics: Dict[str, Any]
    worker_stats: Dict[str, Any]
    websocket_stats: Dict[str, Any]

# Application start time
start_time = time.time()

async def check_redis_health() -> Dict[str, Any]:
    """Check Redis health"""
    try:
        start = time.perf_counter()
        await redis_client.ping()
        latency = (time.perf_counter() - start) * 1000
        
        return {
            "status": "healthy",
            "latency_ms": round(latency, 2),
            "connected": True
        }
    except Exception as e:
        return {
            "status": "unhealthy",
            "error": str(e),
            "connected": False
        }

async def check_worker_health() -> Dict[str, Any]:
    """Check event worker health"""
    try:
        if event_worker and event_worker.running:
            stats = await event_worker.get_worker_stats()
            return {
                "status": "healthy",
                "running": True,
                "processed_count": stats["processed_count"],
                "success_rate": stats["success_rate"]
            }
        else:
            return {
                "status": "unhealthy",
                "running": False,
                "error": "Worker not running"
            }
    except Exception as e:
        return {
            "status": "unhealthy",
            "error": str(e),
            "running": False
        }

async def check_websocket_health() -> Dict[str, Any]:
    """Check WebSocket manager health"""
    try:
        if websocket_manager:
            stats = await websocket_manager.get_connection_stats()
            return {
                "status": "healthy",
                "active_connections": stats["active_connections"],
                "total_messages": stats["total_messages_sent"]
            }
        else:
            return {
                "status": "unhealthy",
                "error": "WebSocket manager not initialized"
            }
    except Exception as e:
        return {
            "status": "unhealthy",
            "error": str(e)
        }

async def check_database_health() -> Dict[str, Any]:
    """Check database health"""
    try:
        # Simple health check - would connect to actual database
        return {
            "status": "healthy",
            "connected": True,
            "url_configured": bool(settings.DATABASE_URL)
        }
    except Exception as e:
        return {
            "status": "unhealthy",
            "error": str(e),
            "connected": False
        }

@router.get("/health", response_model=HealthCheckResponse)
async def health_check():
    """Basic health check endpoint"""
    
    uptime = time.time() - start_time
    
    # Check critical services
    services = {
        "redis": await check_redis_health(),
        "worker": await check_worker_health(),
        "websocket": await check_websocket_health(),
    }
    
    # Overall status
    all_healthy = all(
        service["status"] == "healthy" 
        for service in services.values()
    )
    
    return HealthCheckResponse(
        status="healthy" if all_healthy else "unhealthy",
        version=settings.VERSION,
        timestamp=time.time(),
        uptime=uptime,
        services=services
    )

@router.get("/health/detailed", response_model=DetailedHealthResponse)
async def detailed_health_check():
    """Detailed health check with metrics"""
    
    uptime = time.time() - start_time
    
    # Check all services
    services = {
        "redis": await check_redis_health(),
        "worker": await check_worker_health(),
        "websocket": await check_websocket_health(),
        "database": await check_database_health(),
        "metrics": {
            "status": "healthy",
            "configured": metrics_collector is not None
        }
    }
    
    # Get current metrics
    try:
        current_metrics = await metrics_collector.get_metrics_summary()
    except Exception:
        current_metrics = {}
    
    # Get worker stats
    try:
        worker_stats = await event_worker.get_worker_stats()
    except Exception:
        worker_stats = {}
    
    # Get WebSocket stats
    try:
        websocket_stats = await websocket_manager.get_connection_stats()
    except Exception:
        websocket_stats = {}
    
    # Overall status
    all_healthy = all(
        service["status"] == "healthy" 
        for service in services.values()
    )
    
    return DetailedHealthResponse(
        status="healthy" if all_healthy else "unhealthy",
        version=settings.VERSION,
        timestamp=time.time(),
        uptime=uptime,
        services=services,
        metrics=current_metrics,
        worker_stats=worker_stats,
        websocket_stats=websocket_stats
    )

@router.get("/ready")
async def readiness_check():
    """Kubernetes readiness probe"""
    
    # Check if essential services are ready
    redis_healthy = (await check_redis_health())["status"] == "healthy"
    worker_healthy = (await check_worker_health())["status"] == "healthy"
    
    if redis_healthy and worker_healthy:
        return {"status": "ready"}
    else:
        return {"status": "not_ready"}

@router.get("/live")
async def liveness_check():
    """Kubernetes liveness probe"""
    
    # Simple liveness check - if we can respond, we're alive
    return {
        "status": "alive",
        "timestamp": time.time(),
        "uptime": time.time() - start_time
    }

@router.get("/health/streams")
async def streams_health():
    """Health check for Redis streams"""
    
    try:
        streams_info = {}
        streams = ["events:stream", "processed:stream", "dlq:stream"]
        
        for stream in streams:
            try:
                info = await redis_client.xinfo_stream(stream)
                streams_info[stream] = {
                    "status": "healthy",
                    "length": info.get("length", 0),
                    "groups": info.get("groups", 0),
                    "last_entry": info.get("last-entry")
                }
            except Exception as e:
                streams_info[stream] = {
                    "status": "unhealthy",
                    "error": str(e)
                }
        
        return {"streams": streams_info}
        
    except Exception as e:
        return {
            "status": "unhealthy",
            "error": str(e)
        }
