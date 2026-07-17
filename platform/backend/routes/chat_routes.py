from fastapi import APIRouter, Request, Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials
import json
from .session_routes import verify_token
from .auth_routes import get_current_username

router = APIRouter()

@router.post("/chat")
async def chat_endpoint(request: Request, user_id: int = Depends(verify_token)):
    data = await request.json()
    session_id = data.get("session_id")
    message = data.get("message")
    chat_db = request.app.state.chat_db
    gateway_client = request.app.state.gateway_client
    
    # Verify session ownership
    sessions = chat_db.get_user_sessions(user_id)
    if not any(s["id"] == session_id for s in sessions):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not your session")

    # Extract username from the Authorization header for per-user session key
    auth_header = request.headers.get("authorization", "")
    username = None
    if auth_header.startswith("Bearer "):
        username = get_current_username(auth_header.split(" ", 1)[1])
        
    try:
        chat_db.add_message(session_id, "user", message)
        await gateway_client.send_agent_message(message, session_id, username)
        return {"message": "Message sent"}
    except Exception as e:
        error_msg = str(e)
        chat_db.add_message(session_id, "agent", f"Error: {error_msg}")
        return {"error": error_msg}

@router.get("/history/{session_id}")
async def get_history(request: Request, session_id: str, user_id: int = Depends(verify_token)):
    chat_db = request.app.state.chat_db
    # Verify session ownership
    sessions = chat_db.get_user_sessions(user_id)
    if not any(s["id"] == session_id for s in sessions):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not your session")
        
    return {"history": chat_db.get_history(session_id)}
