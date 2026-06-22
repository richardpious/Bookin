from fastapi import APIRouter, Request
from pydantic import BaseModel
from typing import Any

router = APIRouter()

class AgentEventPayload(BaseModel):
    session: str
    event: str
    data: Any

@router.post("/internal/agent-event")
async def agent_event(request: Request, payload: AgentEventPayload):
    manager = request.app.state.manager
    
    session = payload.session
    event = payload.event
    data = payload.data

    # Log all connections
    registered_sessions = list(manager.active_connections.keys())
    print(f"DEBUG: active_connections: {registered_sessions}")
    print(f"DEBUG: trying to send to: {session}")

    target_session = None
    for sess in registered_sessions:
        if sess == session or session.endswith(sess):
            target_session = sess
            break

    print(f"DEBUG: final target session: {target_session}")
    if target_session:
        await manager.send_personal_message(
            {"type": event, "data": data},
            target_session
        )
        return {"status": "ok"}
    else:
        return {"status": "error", "message": f"Session {session} not found. Active: {registered_sessions}"}

