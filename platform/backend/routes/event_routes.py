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
    print(f"DEBUG: manager is {manager}")
    print(f"DEBUG: manager active_connections: {manager.active_connections}")
    await manager.send_personal_message(
        {"type": payload.event, "data": payload.data},
        payload.session
    )
    return {"status": "ok"}

