from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Depends
from typing import Dict, Any
import asyncio
import json

from src.services.websocket_manager import WebSocketManager
from src.monitoring.metrics import MetricsCollector

router = APIRouter()

# Global instances (initialized in main.py)
websocket_manager: WebSocketManager = None
metrics_collector: MetricsCollector = None

@router.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    """
    WebSocket endpoint for real-time updates
    
    - Accepts connections and tracks them
    - Broadcasts metrics and events
    - Handles connection lifecycle
    """
    client_id = None
    
    try:
        # Extract client ID from query params if provided
        query_params = websocket.query_params
        client_id = query_params.get("client_id")
        
        # Accept connection
        await websocket_manager.connect(websocket, client_id)
        
        # Handle messages
        while True:
            try:
                # Receive message from client
                data = await websocket.receive_text()
                message = json.loads(data)
                
                # Handle different message types
                await handle_websocket_message(websocket, message)
                
            except WebSocketDisconnect:
                break
            except json.JSONDecodeError:
                await websocket_manager.send_personal_message({
                    "type": "error",
                    "message": "Invalid JSON format"
                }, websocket)
            except Exception as e:
                await websocket_manager.send_personal_message({
                    "type": "error",
                    "message": f"Error processing message: {str(e)}"
                }, websocket)
                
    except WebSocketDisconnect:
        pass
    except Exception as e:
        print(f"WebSocket error: {e}")
    finally:
        # Cleanup connection
        websocket_manager.disconnect(websocket)

async def handle_websocket_message(websocket: WebSocket, message: Dict[str, Any]):
    """Handle incoming WebSocket messages"""
    
    message_type = message.get("type")
    
    if message_type == "ping":
        # Respond to ping
        await websocket_manager.send_personal_message({
            "type": "pong",
            "timestamp": asyncio.get_event_loop().time()
        }, websocket)
    
    elif message_type == "subscribe":
        # Handle subscription requests
        await handle_subscription(websocket, message)
    
    elif message_type == "get_metrics":
        # Send current metrics
        metrics = await metrics_collector.get_metrics_summary()
        await websocket_manager.send_personal_message({
            "type": "metrics_response",
            "data": metrics
        }, websocket)
    
    elif message_type == "get_stats":
        # Send connection stats
        stats = await websocket_manager.get_connection_stats()
        await websocket_manager.send_personal_message({
            "type": "stats_response",
            "data": stats
        }, websocket)
    
    else:
        # Unknown message type
        await websocket_manager.send_personal_message({
            "type": "error",
            "message": f"Unknown message type: {message_type}"
        }, websocket)

async def handle_subscription(websocket: WebSocket, message: Dict[str, Any]):
    """Handle subscription requests"""
    
    subscription_type = message.get("subscription")
    
    if subscription_type == "metrics":
        # Subscribe to metrics updates (already enabled by default)
        await websocket_manager.send_personal_message({
            "type": "subscription_confirmed",
            "subscription": "metrics",
            "message": "Subscribed to metrics updates"
        }, websocket)
    
    elif subscription_type == "events":
        # Subscribe to event updates
        await websocket_manager.send_personal_message({
            "type": "subscription_confirmed",
            "subscription": "events",
            "message": "Subscribed to event updates"
        }, websocket)
    
    elif subscription_type == "anomalies":
        # Subscribe to anomaly alerts
        await websocket_manager.send_personal_message({
            "type": "subscription_confirmed",
            "subscription": "anomalies",
            "message": "Subscribed to anomaly alerts"
        }, websocket)
    
    else:
        await websocket_manager.send_personal_message({
            "type": "error",
            "message": f"Unknown subscription type: {subscription_type}"
        }, websocket)
