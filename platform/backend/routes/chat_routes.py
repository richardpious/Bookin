from fastapi import APIRouter, Request, WebSocket, WebSocketDisconnect
import json
router = APIRouter()

@router.post("/chat")
async def chat_endpoint(request: Request):
    data = await request.json()
    session_id = data.get("session_id")
    message = data.get("message")
    session_key = f"webchat:{session_id}"
    chat_db = request.app.state.chat_db
    # Note: AgentBridge has been deprecated and removed. We route directly to gateway_client.
    gateway_client = request.app.state.gateway_client
    try:
        chat_db.add_message(session_id, "user", message)
        await gateway_client.send_agent_message(message, session_id)
        # The WebSocket listener will receive the streaming response.
        # This HTTP endpoint is legacy and does not receive synchronous response.
        return {"message": "Message sent"}
    except Exception as e:
        error_msg = str(e)
        chat_db.add_message(session_id, "agent", f"Error: {error_msg}")
        return {"error": error_msg}

@router.get("/history/{session_id}")
async def get_history(request: Request, session_id: str):
    return {"history": request.app.state.chat_db.get_history(session_id)}
