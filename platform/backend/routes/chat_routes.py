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
    # Note: AgentBridge is now mostly deprecated in favor of gateway_client
    # but we keep this for now to avoid breaking the /chat route
    agent_bridge = request.app.state.agent_bridge
    try:
        chat_db.add_message(session_id, "user", message)
        response = await agent_bridge.send_message(message, session_key)
        chat_db.add_message(session_id, "agent", response)
        return {"message": response}
    except Exception as e:
        error_msg = str(e)
        chat_db.add_message(session_id, "agent", f"Error: {error_msg}")
        return {"error": error_msg}

@router.get("/history/{session_id}")
async def get_history(request: Request, session_id: str):
    return {"history": request.app.state.chat_db.get_history(session_id)}
