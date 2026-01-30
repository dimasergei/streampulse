import asyncio
import redis.asyncio as redis
from typing import AsyncIterator
import structlog
from datetime import datetime

logger = structlog.get_logger()

class StreamProcessor:
    """
    High-throughput event processor
    
    - Ingests from multiple sources
    - Validates and enriches data
    - Publishes to Redis streams
    - Handles backpressure
    """
    
    def __init__(self, redis_client: redis.Redis):
        self.redis = redis_client
        self.stream_key = "events:stream"
    
    async def ingest_batch(self, events: list[dict]) -> int:
        """
        Ingest batch of events
        
        Returns:
            Number of events successfully ingested
        """
        pipeline = self.redis.pipeline()
        
        for event in events:
            # Validate
            if not self._validate_event(event):
                logger.warning("invalid_event", event=event)
                continue
            
            # Enrich
            enriched = self._enrich_event(event)
            
            # Add to stream
            pipeline.xadd(
                self.stream_key,
                enriched,
                maxlen=1000000,  # Keep last 1M events
            )
        
        results = await pipeline.execute()
        return len([r for r in results if r])
    
    def _validate_event(self, event: dict) -> bool:
        """Validate event has required fields"""
        required = ["timestamp", "type", "value"]
        return all(field in event for field in required)
    
    def _enrich_event(self, event: dict) -> dict:
        """Add metadata to event"""
        return {
            **event,
            "ingested_at": datetime.utcnow().isoformat(),
            "processed": "false",
        }
