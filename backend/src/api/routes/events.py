from fastapi import APIRouter, HTTPException, Depends, BackgroundTasks
from pydantic import BaseModel, Field
from typing import List, Dict, Any, Optional
import time
import asyncio
import redis.asyncio as redis

from src.core.config import get_settings
from src.core.exceptions import create_http_exception, ValidationException
from src.ingestion.stream_processor import StreamProcessor
from src.services.worker import EventWorker
from src.monitoring.metrics import MetricsCollector

settings = get_settings()
router = APIRouter()

# Global instances (initialized in main.py)
redis_client: redis.Redis = None
metrics_collector: MetricsCollector = None
stream_processor: StreamProcessor = None
event_worker: EventWorker = None

class Event(BaseModel):
    timestamp: str = Field(..., description="Event timestamp (ISO format)")
    type: str = Field(..., description="Event type")
    value: float = Field(..., description="Event value")
    metadata: Dict[str, Any] = Field(default_factory=dict, description="Additional metadata")
    
    class Config:
        schema_extra = {
            "example": {
                "timestamp": "2024-01-30T10:45:00Z",
                "type": "sensor_reading",
                "value": 42.5,
                "metadata": {"sensor_id": "temp-001", "location": "server-room"}
            }
        }

class BatchIngestRequest(BaseModel):
    events: List[Event] = Field(..., min_items=1, max_items=1000, description="Events to ingest")
    
class IngestResponse(BaseModel):
    success: bool
    ingested: int
    total: int
    processing_time_ms: float
    batch_id: str

class MetricsResponse(BaseModel):
    events_per_second: float
    avg_latency: float
    p95_latency: float
    anomalies: int
    uptime: float
    throughput_target: int
    latency_target: int
    anomaly_accuracy: float
    active_connections: int

class WorkerStatsResponse(BaseModel):
    running: bool
    processed_count: int
    failed_count: int
    dlq_count: int
    success_rate: float

@router.post("/ingest", response_model=IngestResponse)
async def ingest_events(
    request: BatchIngestRequest,
    background_tasks: BackgroundTasks
):
    """
    Ingest batch of events into the stream
    
    - Validates event format
    - Tracks ingestion metrics
    - Provides batch processing feedback
    """
    start_time = time.perf_counter()
    
    try:
        # Validate batch size
        if len(request.events) > settings.MAX_BATCH_SIZE:
            raise ValidationException(
                f"Batch size exceeds maximum of {settings.MAX_BATCH_SIZE} events"
            )
        
        # Convert to dict format
        event_dicts = [event.dict() for event in request.events]
        
        # Validate individual events
        for event in event_dicts:
            if not _validate_event(event):
                raise ValidationException(f"Invalid event format: {event}")
        
        # Ingest to stream
        ingested = await stream_processor.ingest_batch(event_dicts)
        
        processing_time = (time.perf_counter() - start_time) * 1000
        
        # Generate batch ID
        batch_id = f"batch_{int(time.time() * 1000)}"
        
        # Background task: Update daily stats
        background_tasks.add_task(update_ingestion_stats, len(request.events), ingested)
        
        return IngestResponse(
            success=True,
            ingested=ingested,
            total=len(request.events),
            processing_time_ms=processing_time,
            batch_id=batch_id
        )
        
    except ValidationException as e:
        raise create_http_exception(
            400,
            f"Validation failed: {e.message}"
        )
    except Exception as e:
        raise create_http_exception(
            500,
            f"Ingestion failed: {str(e)}"
        )

@router.post("/ingest/single")
async def ingest_single_event(event: Event):
    """Ingest a single event"""
    try:
        event_dict = event.dict()
        
        if not _validate_event(event_dict):
            raise ValidationException("Invalid event format")
        
        ingested = await stream_processor.ingest_batch([event_dict])
        
        return {
            "success": True,
            "ingested": ingested,
            "event_id": f"event_{int(time.time() * 1000)}"
        }
        
    except ValidationException as e:
        raise create_http_exception(400, f"Validation failed: {e.message}")
    except Exception as e:
        raise create_http_exception(500, f"Ingestion failed: {str(e)}")

@router.get("/metrics", response_model=MetricsResponse)
async def get_metrics():
    """Get current system metrics"""
    
    try:
        metrics = await metrics_collector.get_metrics_summary()
        return MetricsResponse(**metrics)
    except Exception as e:
        raise create_http_exception(
            500,
            f"Failed to retrieve metrics: {str(e)}"
        )

@router.get("/metrics/latency/history")
async def get_latency_history(hours: int = 24):
    """Get latency history for charts"""
    
    try:
        history = await metrics_collector.get_latency_history(hours)
        return {"history": history, "hours": hours}
    except Exception as e:
        raise create_http_exception(
            500,
            f"Failed to retrieve latency history: {str(e)}"
        )

@router.get("/metrics/throughput/history")
async def get_throughput_history(hours: int = 24):
    """Get throughput history for charts"""
    
    try:
        history = await metrics_collector.get_throughput_history(hours)
        return {"history": history, "hours": hours}
    except Exception as e:
        raise create_http_exception(
            500,
            f"Failed to retrieve throughput history: {str(e)}"
        )

@router.get("/worker/stats", response_model=WorkerStatsResponse)
async def get_worker_stats():
    """Get event worker statistics"""
    
    try:
        stats = await event_worker.get_worker_stats()
        return WorkerStatsResponse(**stats)
    except Exception as e:
        raise create_http_exception(
            500,
            f"Failed to retrieve worker stats: {str(e)}"
        )

@router.get("/dlq/events")
async def get_dlq_events(limit: int = 100):
    """Get events from Dead Letter Queue"""
    
    try:
        events = await event_worker.get_dlq_events(limit)
        return {"events": events, "total": len(events)}
    except Exception as e:
        raise create_http_exception(
            500,
            f"Failed to retrieve DLQ events: {str(e)}"
        )

@router.post("/dlq/{event_id}/retry")
async def retry_dlq_event(event_id: str):
    """Retry a specific event from Dead Letter Queue"""
    
    try:
        success = await event_worker.retry_dlq_event(event_id)
        if success:
            return {"success": True, "message": f"Event {event_id} retried successfully"}
        else:
            raise create_http_exception(
                404,
                f"Event {event_id} not found in DLQ"
            )
    except Exception as e:
        raise create_http_exception(
            500,
            f"Failed to retry event: {str(e)}"
        )

@router.post("/worker/start")
async def start_worker():
    """Start the event worker (if not running)"""
    
    try:
        if not event_worker.running:
            asyncio.create_task(event_worker.start())
            return {"success": True, "message": "Worker started"}
        else:
            return {"success": True, "message": "Worker already running"}
    except Exception as e:
        raise create_http_exception(
            500,
            f"Failed to start worker: {str(e)}"
        )

@router.post("/worker/stop")
async def stop_worker():
    """Stop the event worker"""
    
    try:
        await event_worker.stop()
        return {"success": True, "message": "Worker stopped"}
    except Exception as e:
        raise create_http_exception(
            500,
            f"Failed to stop worker: {str(e)}"
        )

@router.get("/streams/info")
async def get_stream_info():
    """Get information about Redis streams"""
    
    try:
        streams_info = {}
        
        # Get info for each stream
        streams = ["events:stream", "processed:stream", "dlq:stream"]
        
        for stream in streams:
            try:
                info = await redis_client.xinfo_stream(stream)
                streams_info[stream] = {
                    "length": info.get("length", 0),
                    "groups": info.get("groups", 0),
                    "first_entry": info.get("first-entry"),
                    "last_entry": info.get("last-entry")
                }
            except Exception:
                streams_info[stream] = {"error": "Stream not found"}
        
        return {"streams": streams_info}
        
    except Exception as e:
        raise create_http_exception(
            500,
            f"Failed to get stream info: {str(e)}"
        )

def _validate_event(event: Dict[str, Any]) -> bool:
    """Validate event has required fields"""
    required_fields = ["timestamp", "type", "value"]
    
    # Check required fields
    if not all(field in event for field in required_fields):
        return False
    
    # Validate value is numeric
    try:
        float(event["value"])
    except (ValueError, TypeError):
        return False
    
    # Validate timestamp format (basic check)
    timestamp = event["timestamp"]
    if not isinstance(timestamp, str):
        return False
    
    return True

async def update_ingestion_stats(total_events: int, ingested_events: int):
    """Background task to update ingestion statistics"""
    try:
        today = int(time.time() // 86400)  # Days since epoch
        stats_key = f"daily_ingestion_stats:{today}"
        
        # Increment counters
        await redis_client.hincrby(stats_key, "total_events", total_events)
        await redis_client.hincrby(stats_key, "ingested_events", ingested_events)
        await redis_client.hincrby(stats_key, "failed_events", total_events - ingested_events)
        
        # Calculate success rate
        success_rate = (ingested_events / total_events * 100) if total_events > 0 else 0
        await redis_client.hset(stats_key, "success_rate", str(success_rate))
        
        # Set expiry (30 days)
        await redis_client.expire(stats_key, 86400 * 30)
        
    except Exception as e:
        logger.error("ingestion_stats_update_failed", error=str(e))
