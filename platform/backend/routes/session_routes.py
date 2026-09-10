from fastapi import APIRouter, Request, Depends, HTTPException, status
from pydantic import BaseModel
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
import uuid
import logging
from .auth_routes import get_current_user, get_optional_username_from_header
from typing import Optional
from paths import get_project_root

logger = logging.getLogger("SessionRoutes")

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
import shutil

@router.post("/sessions")
async def create_session(request: Request, data: SessionCreate, user_id: int = Depends(verify_token), username: Optional[str] = Depends(get_optional_username_from_header)):
    session_id = str(uuid.uuid4())
    
    if username:
        root_dir = get_project_root()
        session_log_dir = os.path.join(root_dir, "logs", username, data.title)
        os.makedirs(session_log_dir, exist_ok=True)
        
        # Copy master booksim into this session's directory
        master_booksim = os.path.join(root_dir, "booksim")
        session_booksim = os.path.join(session_log_dir, "booksim")
        if os.path.isdir(master_booksim) and not os.path.exists(session_booksim):
            shutil.copytree(master_booksim, session_booksim, symlinks=True, dirs_exist_ok=True)
            
        # Copy master configs into this session's directory
        master_configs = os.path.join(root_dir, "configs")
        session_configs = os.path.join(session_log_dir, "configs")
        if os.path.isdir(master_configs) and not os.path.exists(session_configs):
            shutil.copytree(master_configs, session_configs, symlinks=True, dirs_exist_ok=True)
        
    request.app.state.chat_db.create_session(session_id, user_id, data.title)
    return {"id": session_id, "title": data.title}


async def _cleanup_session_resources(request: Request, session_id: str, username: Optional[str]):
    """Helper to clean up WebSockets, gateway session, and log files for a session."""
    manager = request.app.state.manager
    gateway_client = request.app.state.gateway_client
    chat_db = request.app.state.chat_db

    compound_key = f"{username}:{session_id}" if username else session_id

    if compound_key in manager.active_connections:
        for ws in manager.active_connections[compound_key]:
            try:
                await ws.send_json({"type": "command", "action": "reset"})
            except Exception:
                pass

    # Send reset command to openclaw
    try:
        await gateway_client.send_agent_message("/reset", session_id, username)
    except Exception as e:
        logger.warning(f"Failed to reset openclaw agent session {session_id}: {e}")

    # Delete session folder from logs
    session_title = chat_db.get_session_title(session_id)
    if username and session_title:
        session_log_dir = os.path.join(get_project_root(), "logs", username, session_title)
        if os.path.exists(session_log_dir):
            shutil.rmtree(session_log_dir)

@router.post("/delete_session/{session_id}")
async def delete_session(request: Request, session_id: str, user_id: int = Depends(verify_token), username: Optional[str] = Depends(get_optional_username_from_header)):
    chat_db = request.app.state.chat_db

    # Verify ownership
    sessions = chat_db.get_user_sessions(user_id)
    if not any(s["id"] == session_id for s in sessions):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not your session")

    try:
        await _cleanup_session_resources(request, session_id, username)
        chat_db.delete_session(session_id)
        return {"status": "success"}
    except Exception as e:
        return {"error": str(e)}

@router.post("/reset_session/{session_id}")
async def reset_session(request: Request, session_id: str, user_id: int = Depends(verify_token), username: Optional[str] = Depends(get_optional_username_from_header)):
    chat_db = request.app.state.chat_db

    # Verify ownership
    sessions = chat_db.get_user_sessions(user_id)
    if not any(s["id"] == session_id for s in sessions):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not your session")

    try:
        await _cleanup_session_resources(request, session_id, username)
        chat_db.reset_session(session_id)
        return {"status": "success"}
    except Exception as e:
        return {"error": str(e)}

