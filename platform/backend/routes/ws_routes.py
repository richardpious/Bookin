from fastapi import APIRouter, Request, WebSocket, WebSocketDisconnect
import json
import uuid
from .auth_routes import get_current_user

router = APIRouter()

@router.websocket("/ws/{client_id}")
async def websocket_endpoint(websocket: WebSocket, client_id: str, token: str = None):
    manager = websocket.app.state.manager
    chat_db = websocket.app.state.chat_db
    gateway_client = websocket.app.state.gateway_client
    
    await manager.connect(client_id, websocket)

    user_id = get_current_user(token) if token else None
    if not user_id:
        await websocket.send_text(json.dumps({"type": "error", "message": "Unauthorized"}))
        await websocket.close(code=1008)
        return

    # Ensure the session exists for this user before allowing messages
    # This fixes the IntegrityError bug
    try:
        chat_db.create_session(client_id, user_id)
    except Exception:
        # Ignore if session already exists. Ideally we'd verify ownership here.
        pass
    
    try:
        while True:
            message_text = await websocket.receive_text()
            print(f"DEBUG: [WebSocket Received] {message_text}")

            # Check if it's a JSON command
            is_silent = False
            message = message_text
            try:
                data = json.loads(message_text)
                if isinstance(data, dict) and data.get("type") == "internal-command":
                    is_silent = True
                    message = data.get("text", "")
            except json.JSONDecodeError:
                pass

            try:
                if not is_silent:
                    chat_db.add_message(client_id, "user", message)
                    
                    # Notify other tabs
                    for ws in manager.active_connections.get(client_id, []):
                        if ws != websocket:
                            try:
                                await ws.send_text(json.dumps({
                                    "type": "user-message",
                                    "message": message
                                }))
                            except:
                                pass
                
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
                await manager.send_personal_message({"type": "error", "message": error_msg}, client_id)
    except WebSocketDisconnect:
        manager.disconnect(client_id, websocket)
    except Exception as e:
        manager.disconnect(client_id, websocket)

