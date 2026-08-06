from fastapi import APIRouter, Request, Depends, HTTPException, status
from pydantic import BaseModel
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
import uuid
from .auth_routes import get_current_user, get_current_username, build_session_key

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

class SessionCreate(BaseModel):
    title: str

@router.get("/sessions")
async def list_sessions(request: Request, user_id: int = Depends(verify_token)):
    return {"sessions": request.app.state.chat_db.get_user_sessions(user_id)}

import os

@router.post("/sessions")
async def create_session(request: Request, data: SessionCreate, user_id: int = Depends(verify_token)):
    session_id = str(uuid.uuid4())
    
    auth_header = request.headers.get("authorization", "")
    username = None
    if auth_header.startswith("Bearer "):
        username = get_current_username(auth_header.split(" ", 1)[1])
        
    if username:
        root_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..', '..'))
        session_log_dir = os.path.join(root_dir, "logs", username, data.title)
        os.makedirs(session_log_dir, exist_ok=True)
        
    request.app.state.chat_db.create_session(session_id, user_id, data.title)
    return {"id": session_id, "title": data.title}

@router.post("/delete_session/{session_id}")
async def delete_session(request: Request, session_id: str, user_id: int = Depends(verify_token)):
    manager = request.app.state.manager
    chat_db = request.app.state.chat_db
    gateway_client = request.app.state.gateway_client

    # Verify ownership
    sessions = chat_db.get_user_sessions(user_id)
    if not any(s["id"] == session_id for s in sessions):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not your session")

    # Extract username from token for compound key and session key
    auth_header = request.headers.get("authorization", "")
    username = None
    if auth_header.startswith("Bearer "):
        username = get_current_username(auth_header.split(" ", 1)[1])

    # Compound key used by connection manager: "username:session_id"
    compound_key = f"{username}:{session_id}" if username else session_id

    try:
        if compound_key in manager.active_connections:
            # Multi-tab support: active_connections[compound_key] is a list of WebSockets
            for ws in manager.active_connections[compound_key]:
                try:
                    await ws.send_json({"type": "command", "action": "reset"})
                except Exception:
                    pass

        # Send reset command to openclaw
        try:
            await gateway_client.send_agent_message("/reset", session_id, username)
        except Exception as e:
            print(f"Warning: Failed to reset openclaw agent session {session_id}: {e}")

        chat_db.delete_session(session_id)
        return {"status": "success"}
    except Exception as e:
        return {"error": str(e)}
