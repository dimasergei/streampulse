import asyncio
import json
from typing import Set, Dict, Any, List
import redis.asyncio as redis
import structlog
from fastapi import WebSocket, WebSocketDisconnect

from src.core.config import get_settings
from src.monitoring.metrics import MetricsCollector

logger = structlog.get_logger()
settings = get_settings()

class WebSocketManager:
    """
    Enterprise WebSocket connection manager
    
    - Manages real-time connections
    - Broadcasts metrics and events
    - Handles connection lifecycle
    """
    
    def __init__(self, redis_client: redis.Redis, metrics_collector: MetricsCollector):
        self.redis = redis_client
        self.metrics = metrics_collector
        self.active_connections: Set[WebSocket] = set()
        self.connection_metadata: Dict[WebSocket, Dict[str, Any]] = {}
        self.running = False
    
    async def connect(self, websocket: WebSocket, client_id: str = None):
        """Accept and track new WebSocket connection"""
        await websocket.accept()
        
        self.active_connections.add(websocket)
        
        # Store connection metadata
        self.connection_metadata[websocket] = {
            "client_id": client_id or f"client_{len(self.active_connections)}",
            "connected_at": asyncio.get_event_loop().time(),
            "message_count": 0
        }
        
        # Update metrics
        self.metrics.update_active_connections(len(self.active_connections))
        
        logger.info(
            "websocket_connected",
            client_id=self.connection_metadata[websocket]["client_id"],
            total_connections=len(self.active_connections)
        )
        
        # Send initial connection message
        await self.send_personal_message({
            "type": "connected",
            "client_id": self.connection_metadata[websocket]["client_id"],
            "message": "Connected to StreamPulse real-time stream"
        }, websocket)
    
    def disconnect(self, websocket: WebSocket):
        """Remove and cleanup WebSocket connection"""
        if websocket in self.active_connections:
            client_id = self.connection_metadata.get(websocket, {}).get("client_id", "unknown")
            
            self.active_connections.remove(websocket)
            self.connection_metadata.pop(websocket, None)
            
            # Update metrics
            self.metrics.update_active_connections(len(self.active_connections))
            
            logger.info(
                "websocket_disconnected",
                client_id=client_id,
                total_connections=len(self.active_connections)
            )
    
    async def send_personal_message(self, message: Dict[str, Any], websocket: WebSocket):
        """Send message to specific WebSocket"""
        try:
            await websocket.send_text(json.dumps(message))
            
            # Update message count
            if websocket in self.connection_metadata:
                self.connection_metadata[websocket]["message_count"] += 1
                
        except Exception as e:
            logger.error(
                "send_personal_message_failed",
                error=str(e),
                client_id=self.connection_metadata.get(websocket, {}).get("client_id", "unknown")
            )
            self.disconnect(websocket)
    
    async def broadcast(self, message: Dict[str, Any]):
        """Broadcast message to all connected clients"""
        if not self.active_connections:
            return
        
        disconnected = set()
        
        for websocket in self.active_connections:
            try:
                await websocket.send_text(json.dumps(message))
            except Exception as e:
                logger.warning(
                    "broadcast_failed",
                    error=str(e),
                    client_id=self.connection_metadata.get(websocket, {}).get("client_id", "unknown")
                )
                disconnected.add(websocket)
        
        # Remove disconnected clients
        for websocket in disconnected:
            self.disconnect(websocket)
        
        if disconnected:
            logger.info(
                "cleaned_disconnected_connections",
                count=len(disconnected)
            )
    
    async def start_broadcast_loop(self):
        """Start background task for periodic broadcasts"""
        self.running = True
        logger.info("starting_broadcast_loop")
        
        while self.running:
            try:
                # Broadcast current metrics
                metrics = await self.metrics.get_metrics_summary()
                if metrics:
                    await self.broadcast({
                        "type": "metrics",
                        "data": metrics,
                        "timestamp": asyncio.get_event_loop().time()
                    })
                
                # Broadcast recent events (sample)
                await self._broadcast_recent_events()
                
                await asyncio.sleep(5)  # Broadcast every 5 seconds
                
            except Exception as e:
                logger.error("broadcast_loop_error", error=str(e))
                await asyncio.sleep(5)
    
    async def _broadcast_recent_events(self):
        """Broadcast recent processed events"""
        try:
            # Get recent events from processed stream
            events = await self.redis.xrevrange(
                "processed:stream",
                count=10,  # Last 10 events
                max="+"
            )
            
            if events:
                event_data = []
                for event_id, fields in events:
                    event_data.append({
                        "id": event_id.decode() if isinstance(event_id, bytes) else event_id,
                        "data": {k.decode() if isinstance(k, bytes) else k: 
                                v.decode() if isinstance(v, bytes) else v 
                                for k, v in fields.items()},
                        "timestamp": fields.get(b"processed_at", fields.get("processed_at", ""))
                    })
                
                await self.broadcast({
                    "type": "recent_events",
                    "data": event_data,
                    "count": len(event_data)
                })
                
        except Exception as e:
            logger.error("broadcast_recent_events_failed", error=str(e))
    
    async def stop_broadcast_loop(self):
        """Stop background broadcast loop"""
        self.running = False
        logger.info("stopping_broadcast_loop")
    
    async def get_connection_stats(self) -> Dict[str, Any]:
        """Get WebSocket connection statistics"""
        total_messages = sum(
            meta.get("message_count", 0) 
            for meta in self.connection_metadata.values()
        )
        
        return {
            "active_connections": len(self.active_connections),
            "total_messages_sent": total_messages,
            "connections": [
                {
                    "client_id": meta["client_id"],
                    "connected_at": meta["connected_at"],
                    "message_count": meta["message_count"],
                    "duration": asyncio.get_event_loop().time() - meta["connected_at"]
                }
                for meta in self.connection_metadata.values()
            ]
        }
    
    async def send_anomaly_alert(self, event_data: Dict[str, Any]):
        """Send immediate alert for detected anomaly"""
        alert = {
            "type": "anomaly_alert",
            "data": {
                "event_id": event_data.get("id"),
                "value": event_data.get("value"),
                "z_score": event_data.get("z_score"),
                "timestamp": event_data.get("processed_at"),
                "severity": "high" if abs(float(event_data.get("z_score", 0))) > 4 else "medium"
            },
            "alert_timestamp": asyncio.get_event_loop().time()
        }
        
        await self.broadcast(alert)
        logger.info(
            "anomaly_alert_sent",
            event_id=event_data.get("id"),
            z_score=event_data.get("z_score")
        )
    
    async def send_throughput_warning(self, current_throughput: float):
        """Send warning if throughput drops below target"""
        target = settings.THROUGHPUT_TARGET
        threshold = target * 0.8  # 80% of target
        
        if current_throughput < threshold:
            warning = {
                "type": "throughput_warning",
                "data": {
                    "current_throughput": current_throughput,
                    "target_throughput": target,
                    "threshold": threshold,
                    "performance_ratio": current_throughput / target
                },
                "warning_timestamp": asyncio.get_event_loop().time()
            }
            
            await self.broadcast(warning)
            logger.warning(
                "throughput_warning_sent",
                current=current_throughput,
                target=target
            )
