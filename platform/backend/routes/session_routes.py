from fastapi import APIRouter, Request, Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from .auth_routes import get_current_user

router = APIRouter()
security = HTTPBearer()

def verify_token(credentials: HTTPAuthorizationCredentials = Depends(security)):
    user_id = get_current_user(credentials.credentials)
    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authentication credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )
    return user_id

@router.get("/sessions")
async def list_sessions(request: Request, user_id: int = Depends(verify_token)):
    return {"sessions": [s["id"] for s in request.app.state.chat_db.get_user_sessions(user_id)]}

@router.post("/delete_session/{session_id}")
async def delete_session(request: Request, session_id: str, user_id: int = Depends(verify_token)):
    manager = request.app.state.manager
    chat_db = request.app.state.chat_db
    gateway_client = request.app.state.gateway_client

    # Verify ownership
    sessions = chat_db.get_user_sessions(user_id)
    if not any(s["id"] == session_id for s in sessions):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not your session")

    try:
        if session_id in manager.active_connections:
            # Multi-tab support: active_connections[session_id] is a list of WebSockets
            for ws in manager.active_connections[session_id]:
                try:
                    await ws.send_json({"type": "command", "action": "reset"})
                except Exception:
                    pass

        # Send reset command to openclaw
        try:
            # sessionId is just the UUID
            await gateway_client.send_agent_message("/reset", session_id)
        except Exception as e:
            print(f"Warning: Failed to reset openclaw agent session {session_id}: {e}")

        chat_db.delete_session(session_id)
        return {"status": "success"}
    except Exception as e:
        return {"error": str(e)}

