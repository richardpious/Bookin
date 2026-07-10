"""
TEMPORARY DEBUG ROUTES — remove before production deployment.
Used to simulate gateway error events for frontend error-handling tests.
"""
from fastapi import APIRouter, Request
from pydantic import BaseModel
from typing import Optional

router = APIRouter(prefix="/debug")

PRESET_ERRORS = {
    "rate_limit":    "rate limit exceeded: 429 Too Many Requests",
    "context":       "context length exceeded: too many tokens in conversation",
    "timeout":       "request timeout: etimedout after 30s",
    "billing":       "billing error: quota exceeded for this billing period",
    "overloaded":    "503 service unavailable: model is currently overloaded",
    "auth":          "401 unauthorized: invalid API key for provider",
    "generic":       "LLM request failed with an unknown error",
}

class SimulateErrorRequest(BaseModel):
    session_id: Optional[str] = None   # if None, broadcasts to all active sessions
    error_type: Optional[str] = "rate_limit"  # key from PRESET_ERRORS
    custom_message: Optional[str] = None      # override with arbitrary text

@router.post("/test-error")
async def simulate_error(request: Request, body: SimulateErrorRequest):
    """
    Injects a fake {type: 'error', message: '...'} packet into active WebSocket sessions.
    Useful for verifying the frontend error classification and styling without hitting a real API.
    """
    manager = request.app.state.manager
    active = list(manager.active_connections.keys())

    if not active:
        return {"status": "no_active_sessions", "active": []}

    message_text = body.custom_message or PRESET_ERRORS.get(body.error_type, PRESET_ERRORS["generic"])
    packet = {"type": "error", "message": message_text}

    targets = [body.session_id] if body.session_id else active
    sent_to = []
    for sess in targets:
        if sess in manager.active_connections:
            await manager.send_personal_message(packet, sess)
            sent_to.append(sess)

    return {
        "status": "ok",
        "packet": packet,
        "sent_to": sent_to,
        "available_error_types": list(PRESET_ERRORS.keys()),
    }

@router.get("/active-sessions")
async def active_sessions(request: Request):
    """Returns currently active WebSocket session IDs."""
    manager = request.app.state.manager
    return {"active": list(manager.active_connections.keys())}
