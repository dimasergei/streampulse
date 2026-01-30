import asyncio
import time
import json
from typing import Dict, List, Any, Optional
import redis.asyncio as redis
import structlog
from datetime import datetime

from src.ingestion.stream_processor import StreamProcessor
from src.processing.anomaly_detector import AnomalyDetector
from src.core.config import get_settings
from src.core.exceptions import StreamProcessingException
from src.monitoring.metrics import MetricsCollector

logger = structlog.get_logger()
settings = get_settings()

class EventWorker:
    """
    Enterprise-grade event worker with DLQ and exponential backoff
    
    - Preserves existing Z-score anomaly detection logic
    - Adds Dead Letter Queue for failed events
    - Implements exponential backoff retry mechanism
    - Maintains 5K events/sec throughput target
    """
    
    def __init__(self, redis_client: redis.Redis, metrics_collector: MetricsCollector):
        self.redis = redis_client
        self.metrics = metrics_collector
        self.stream_processor = StreamProcessor(redis_client)
        self.anomaly_detector = AnomalyDetector()
        self.running = False
        self.processed_count = 0
        self.failed_count = 0
        self.dlq_count = 0
    
    async def start(self):
        """Start the event processing worker"""
        self.running = True
        logger.info("starting_event_worker")
        
        # Start multiple worker tasks for concurrency
        tasks = []
        for i in range(3):  # 3 concurrent workers
            task = asyncio.create_task(self._worker_loop(f"worker-{i}"))
            tasks.append(task)
        
        # Start metrics updater
        metrics_task = asyncio.create_task(self._update_metrics_loop())
        tasks.append(metrics_task)
        
        try:
            await asyncio.gather(*tasks)
        except Exception as e:
            logger.error("worker_loop_failed", error=str(e))
            raise
        finally:
            self.running = False
    
    async def stop(self):
        """Stop the event processing worker"""
        self.running = False
        logger.info("stopping_event_worker")
    
    async def _worker_loop(self, worker_id: str):
        """Main worker processing loop"""
        logger.info("worker_started", worker_id=worker_id)
        
        while self.running:
            try:
                # Read events from stream
                events = await self._read_events()
                
                if not events:
                    await asyncio.sleep(0.1)  # No events, brief pause
                    continue
                
                # Process batch of events
                await self._process_events_batch(worker_id, events)
                
            except Exception as e:
                logger.error("worker_loop_error", worker_id=worker_id, error=str(e))
                await asyncio.sleep(1)  # Brief pause on error
    
    async def _read_events(self) -> List[Dict[str, Any]]:
        """Read events from Redis stream"""
        try:
            # Read from main stream
            events = await self.redis.xread(
                {"events:stream": "$"},
                block=1000,  # 1 second timeout
                count=settings.MAX_BATCH_SIZE
            )
            
            processed_events = []
            for stream, event_list in events:
                for event_id, fields in event_list:
                    processed_events.append({
                        "id": event_id,
                        "data": fields,
                        "stream": stream
                    })
            
            return processed_events
            
        except Exception as e:
            logger.error("read_events_failed", error=str(e))
            return []
    
    async def _process_events_batch(self, worker_id: str, events: List[Dict[str, Any]]):
        """Process a batch of events"""
        for event in events:
            try:
                await self._process_single_event(worker_id, event)
            except Exception as e:
                await self._handle_event_failure(event, e)
    
    async def _process_single_event(self, worker_id: str, event: Dict[str, Any]):
        """Process a single event"""
        start_time = self.metrics.record_processing_start()
        
        try:
            # Extract event data
            event_data = event["data"]
            event_id = event["id"]
            
            # Validate event
            if not self._validate_event(event_data):
                raise StreamProcessingException("Invalid event format")
            
            # Detect anomalies (preserving existing Z-score logic)
            value = float(event_data.get("value", 0))
            is_anomaly, z_score = self.anomaly_detector.detect(value)
            
            # Enrich event with processing results
            enriched_event = {
                **event_data,
                "processed_at": datetime.utcnow().isoformat(),
                "worker_id": worker_id,
                "anomaly_detected": str(is_anomaly),
                "z_score": str(z_score),
                "processing_time": str(time.perf_counter())
            }
            
            # Store processed event
            await self._store_processed_event(event_id, enriched_event)
            
            # Update metrics
            self.metrics.record_processing_end(start_time, is_anomaly)
            self.processed_count += 1
            
            # Log anomaly if detected
            if is_anomaly:
                logger.info(
                    "anomaly_detected",
                    event_id=event_id,
                    value=value,
                    z_score=z_score,
                    worker_id=worker_id
                )
            
        except Exception as e:
            self.metrics.record_processing_end(start_time)
            raise StreamProcessingException(f"Event processing failed: {str(e)}")
    
    def _validate_event(self, event_data: Dict[str, Any]) -> bool:
        """Validate event has required fields"""
        required_fields = ["timestamp", "type", "value"]
        return all(field in event_data for field in required_fields)
    
    async def _store_processed_event(self, event_id: str, enriched_event: Dict[str, Any]):
        """Store processed event in processed stream"""
        try:
            await self.redis.xadd(
                "processed:stream",
                enriched_event,
                maxlen=1000000  # Keep last 1M events
            )
        except Exception as e:
            logger.error("store_processed_event_failed", event_id=event_id, error=str(e))
    
    async def _handle_event_failure(self, event: Dict[str, Any], error: Exception):
        """Handle event processing failure with DLQ and retry"""
        self.failed_count += 1
        
        # Add retry metadata
        retry_count = int(event["data"].get("retry_count", 0)) + 1
        event["data"]["retry_count"] = retry_count
        event["data"]["last_error"] = str(error)
        event["data"]["failed_at"] = datetime.utcnow().isoformat()
        
        if retry_count <= settings.DLQ_MAX_RETRIES:
            # Calculate exponential backoff delay
            backoff_delay = settings.DLQ_BACKOFF_BASE ** retry_count
            
            logger.warning(
                "event_retry_scheduled",
                event_id=event["id"],
                retry_count=retry_count,
                backoff_delay=backoff_delay,
                error=str(error)
            )
            
            # Schedule retry with exponential backoff
            asyncio.create_task(self._retry_event_later(event, backoff_delay))
        else:
            # Max retries exceeded, send to DLQ
            await self._send_to_dlq(event, error)
    
    async def _retry_event_later(self, event: Dict[str, Any], delay: float):
        """Retry event after delay"""
        await asyncio.sleep(delay)
        
        try:
            # Re-add event to main stream for retry
            await self.redis.xadd(
                "events:stream",
                event["data"],
                maxlen=1000000
            )
            
            logger.info(
                "event_retried",
                event_id=event["id"],
                retry_count=event["data"]["retry_count"]
            )
            
        except Exception as e:
            logger.error(
                "event_retry_failed",
                event_id=event["id"],
                error=str(e)
            )
            # Send to DLQ if retry fails
            await self._send_to_dlq(event, e)
    
    async def _send_to_dlq(self, event: Dict[str, Any], error: Exception):
        """Send event to Dead Letter Queue"""
        try:
            dlq_event = {
                **event["data"],
                "original_event_id": event["id"],
                "dlq_reason": str(error),
                "dlq_timestamp": datetime.utcnow().isoformat(),
                "final_retry_count": event["data"].get("retry_count", 0)
            }
            
            await self.redis.xadd(
                "dlq:stream",
                dlq_event,
                maxlen=100000  # Keep last 100K failed events
            )
            
            self.dlq_count += 1
            
            logger.error(
                "event_sent_to_dlq",
                event_id=event["id"],
                reason=str(error),
                retry_count=event["data"].get("retry_count", 0)
            )
            
        except Exception as e:
            logger.error(
                "dlq_send_failed",
                event_id=event["id"],
                error=str(e)
            )
    
    async def _update_metrics_loop(self):
        """Update metrics periodically"""
        while self.running:
            try:
                # Update throughput
                current_time = time.time()
                if hasattr(self, '_last_metrics_time'):
                    time_diff = current_time - self._last_metrics_time
                    events_diff = self.processed_count - self._last_processed_count
                    throughput = events_diff / time_diff if time_diff > 0 else 0
                    self.metrics.update_throughput(throughput)
                
                self._last_metrics_time = current_time
                self._last_processed_count = self.processed_count
                
                # Update other metrics
                self.metrics.update_latency_p95()
                self.metrics.update_uptime()
                
                # Store metrics in Redis
                await self.metrics._store_metrics()
                
                await asyncio.sleep(5)  # Update every 5 seconds
                
            except Exception as e:
                logger.error("metrics_update_failed", error=str(e))
                await asyncio.sleep(5)
    
    async def get_worker_stats(self) -> Dict[str, Any]:
        """Get worker statistics"""
        return {
            "running": self.running,
            "processed_count": self.processed_count,
            "failed_count": self.failed_count,
            "dlq_count": self.dlq_count,
            "success_rate": (
                self.processed_count / (self.processed_count + self.failed_count)
                if (self.processed_count + self.failed_count) > 0 else 0
            )
        }
    
    async def get_dlq_events(self, limit: int = 100) -> List[Dict[str, Any]]:
        """Get events from Dead Letter Queue"""
        try:
            events = await self.redis.xrevrange(
                "dlq:stream",
                count=limit,
                max="+"
            )
            
            return [
                {
                    "id": event_id,
                    "data": fields,
                }
                for event_id, fields in events
            ]
        except Exception as e:
            logger.error("get_dlq_events_failed", error=str(e))
            return []
    
    async def retry_dlq_event(self, event_id: str) -> bool:
        """Retry a specific event from DLQ"""
        try:
            # Get event from DLQ
            events = await self.redis.xrange("dlq:stream", min=event_id, max=event_id)
            
            if not events:
                return False
            
            _, event_data = events[0]
            
            # Remove retry metadata and re-add to main stream
            cleaned_data = {k: v for k, v in event_data.items() 
                          if not k.startswith(('retry_count', 'last_error', 'failed_at', 'dlq_'))}
            
            await self.redis.xadd("events:stream", cleaned_data)
            
            # Remove from DLQ
            await self.redis.xdel("dlq:stream", event_id)
            
            logger.info("dlq_event_retried", event_id=event_id)
            return True
            
        except Exception as e:
            logger.error("retry_dlq_event_failed", event_id=event_id, error=str(e))
            return False
