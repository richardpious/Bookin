from fastapi import APIRouter, Request, WebSocket, WebSocketDisconnect
import json
import uuid
import logging
from .auth_routes import get_current_user, get_current_username, build_session_key

logger = logging.getLogger("WebSocketRoutes")

router = APIRouter()

@router.websocket("/ws/{client_id}")
async def websocket_endpoint(websocket: WebSocket, client_id: str, token: str = None):
    manager = websocket.app.state.manager
    chat_db = websocket.app.state.chat_db
    gateway_client = websocket.app.state.gateway_client
    
    user_id = get_current_user(token) if token else None
    username = get_current_username(token) if token else None
    if not user_id or not username:
        await websocket.accept()
        await websocket.send_text(json.dumps({"type": "error", "message": "Unauthorized"}))
        await websocket.close(code=1008)
        return

    # Compound key for connection manager: "{username}:{session_id}"
    # This ensures two users with the same session name get separate routing
    compound_key = f"{username}:{client_id}"
    
    await manager.connect(compound_key, websocket)

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

            # Application-level keep-alive: respond to pings immediately
            # without processing them as chat messages. This generates real
            # data-frame traffic that cloud reverse proxies (CloudSandbox,
            # Cloudflare, etc.) recognise, preventing idle-timeout drops.
            try:
                _peek = json.loads(message_text)
                if isinstance(_peek, dict) and _peek.get("type") == "ping":
                    await websocket.send_text(json.dumps({"type": "pong"}))
                    continue
            except (json.JSONDecodeError, ValueError):
                pass

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
                    
                    # Notify other tabs (using compound_key for correct routing)
                    for ws in manager.active_connections.get(compound_key, []):
                        if ws != websocket:
                            try:
                                await ws.send_text(json.dumps({
                                    "type": "user-message",
                                    "message": message
                                }))
                            except:
                                pass

                # Guard: prevent sending while an agent run is already in-flight
                busy_sessions = websocket.app.state.busy_sessions
                if compound_key in busy_sessions:
                    logger.warning(f"Blocked duplicate chat.send for busy session: {compound_key}")
                    await manager.send_personal_message(
                        {"type": "error", "message": "Agent is still processing. Please wait for the current response to finish."},
                        compound_key
                    )
                    continue
                
                # Send the message through the persistent Gateway WebSocket connection
                busy_sessions.add(compound_key)
                req_id = str(uuid.uuid4())
                gateway_client.pending_chat_requests[req_id] = compound_key
                await gateway_client.websocket.send(json.dumps({
                    "type": "req",
                    "id": req_id,
                    "method": "chat.send",
                    "params": {
                        "sessionKey": build_session_key(username, client_id),
                        "sessionId": compound_key,
                        "message": message,
                        "deliver": False,
                        "idempotencyKey": str(uuid.uuid4())
                    }
                }))
                
            except Exception as e:
                # Clear busy flag on send failure so the session isn't permanently stuck
                websocket.app.state.busy_sessions.discard(compound_key)
                error_msg = str(e)
                chat_db.add_message(client_id, "agent", f"Error: {error_msg}")
                await manager.send_personal_message({"type": "error", "message": error_msg}, compound_key)
    except WebSocketDisconnect:
        manager.disconnect(compound_key, websocket)
        # Clear busy flag if no more connections remain for this session
        if compound_key not in manager.active_connections:
            websocket.app.state.busy_sessions.discard(compound_key)
    except Exception as e:
        manager.disconnect(compound_key, websocket)
        if compound_key not in manager.active_connections:
            websocket.app.state.busy_sessions.discard(compound_key)
