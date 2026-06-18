from fastapi import APIRouter, Request, WebSocket, WebSocketDisconnect
import json
import uuid

router = APIRouter()

@router.websocket("/ws/{client_id}")
async def websocket_endpoint(websocket: WebSocket, client_id: str):
    manager = websocket.app.state.manager
    chat_db = websocket.app.state.chat_db
    gateway_client = websocket.app.state.gateway_client
    
    await manager.connect(client_id, websocket)
    
    try:
        while True:
            message = await websocket.receive_text()
            print(f"DEBUG: [WebSocket Received] {message}")
            try:
                chat_db.add_message(client_id, "user", message)
                
                # Send the message through the persistent Gateway WebSocket connection
                await gateway_client.websocket.send(json.dumps({
                    "type": "req",
                    "id": str(uuid.uuid4()),
                    "method": "chat.send",
                    "params": {
                        "sessionKey": f"agent:main:webchat:{client_id}",
                        "sessionId": client_id, # You might want to persist or reuse this
                        "message": message,
                        "deliver": False,
                        "idempotencyKey": str(uuid.uuid4())
                    }
                }))
                
            except Exception as e:
                error_msg = str(e)
                chat_db.add_message(client_id, "agent", f"Error: {error_msg}")
                await websocket.send_text(json.dumps({"type": "error", "message": error_msg}))
    except WebSocketDisconnect:
        manager.disconnect(client_id)
    except Exception as e:
        manager.disconnect(client_id)

