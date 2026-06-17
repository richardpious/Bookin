from fastapi import APIRouter, Request, WebSocket, WebSocketDisconnect
import json

router = APIRouter()

@router.websocket("/ws/{client_id}")
async def websocket_endpoint(websocket: WebSocket, client_id: str):
    manager = websocket.app.state.manager
    chat_db = websocket.app.state.chat_db
    agent_bridge = websocket.app.state.agent_bridge
    
    await manager.connect(client_id, websocket)
    session_key = f"webchat:{client_id}"
    
    try:
        while True:
            message = await websocket.receive_text()
            print(f"DEBUG: [WebSocket Received] {message}")
            try:
                chat_db.add_message(client_id, "user", message)
                response = await agent_bridge.send_message(message, session_key)
                chat_db.add_message(client_id, "agent", response)

                if response.strip().startswith("WEB_SOCKET_SEND: "):
                    json_str = response.split("WEB_SOCKET_SEND: ", 1)[1]
                    print(f"DEBUG: [WebSocket Sending] {json_str}")
                    await websocket.send_text(json_str)
                else:
                    print(f"DEBUG: [WebSocket Sending] chunk/done")
                    await websocket.send_text(json.dumps({"type": "chunk", "message": response}))
                    await websocket.send_text(json.dumps({"type": "done"}))
            except Exception as e:
                error_msg = str(e)
                chat_db.add_message(client_id, "agent", f"Error: {error_msg}")
                await websocket.send_text(json.dumps({"type": "error", "message": error_msg}))
    except WebSocketDisconnect:
        manager.disconnect(client_id)
    except Exception as e:
        manager.disconnect(client_id)

