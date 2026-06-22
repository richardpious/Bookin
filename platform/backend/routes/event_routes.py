from fastapi import APIRouter, Request
from pydantic import BaseModel

router = APIRouter()

class AgentEventRequest(BaseModel):
    session: str
    event: str
    data: dict

@router.post("/internal/agent-event")
async def agent_event(request: Request, payload: AgentEventRequest):
    manager = request.app.state.manager

    # Debug active connections to see what the frontend is actually registered as
    registered_sessions = list(manager.active_connections.keys())
    print(f"DEBUG: active_connections: {registered_sessions}")
    print(f"DEBUG: trying to send to: {payload.session}")

    # If the session isn't in active_connections, maybe it needs "webchat:" prefix?
    # Let's try matching if it exists in the active connections.
    target_session = payload.session
    if target_session not in registered_sessions:
         # Try common prefix variations if they exist in active connections
         for session in registered_sessions:
             if session.endswith(target_session):
                 target_session = session
                 break

    print(f"DEBUG: final target session: {target_session}")
    await manager.send_personal_message(
        {"type": payload.event, "data": payload.data},
        target_session
    )
    return {"status": "ok"}

