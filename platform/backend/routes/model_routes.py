from fastapi import APIRouter, Request, Depends, Header as FastAPIHeader
from typing import Optional
import uuid
import json
import asyncio
from .auth_routes import get_current_username, build_session_key

router = APIRouter()

# Global variable to store models, ideally should be handled better
available_models = []

@router.get("/init-session")
async def init_session(session_id: str, request: Request, authorization: Optional[str] = FastAPIHeader(None)):
    # Extract username from token for per-user session isolation
    username = None
    if authorization and authorization.startswith("Bearer "):
        username = get_current_username(authorization.split(" ", 1)[1])

    # 1. Fetch available models
    models_response = await get_models(request)

    # 2. Fetch session model
    session_model_response = await get_session_model(session_id, request, username)

    # 3. Get session details for thinking level
    session_data = await get_session_data(session_id, request, username)

    return {
        "models": models_response.get("models", []),
        "model": session_model_response.get("model"),
        "thinkingLevel": session_data.get("thinkingLevel"),
        "thinkingLevels": session_data.get("thinkingLevels")
    }
@router.get("/available-models")
async def get_models(request: Request):
    gateway_client = request.app.state.gateway_client

    request_id = str(uuid.uuid4())
    print(f"DEBUG: Sending models.list with ID: {request_id}")
    await gateway_client.websocket.send(json.dumps({
        "type": "req",
        "id": request_id,
        "method": "models.list",
        "params": {}
    }))
    
    # Ensure pending_responses dict exists
    if not hasattr(request.app.state, 'pending_responses'):
        request.app.state.pending_responses = {}

    # Wait for response (up to a timeout)
    timeout = 5
    start_time = asyncio.get_event_loop().time()
    while (asyncio.get_event_loop().time() - start_time) < timeout:
        resp = request.app.state.pending_responses.get(request_id)
        if resp:
            # Clean up
            del request.app.state.pending_responses[request_id]

            payload = resp.get('payload') or {}
            models_data = payload.get('models', [])

            # Group models by provider
            providers = {}
            for m in models_data:
                p = m.get('provider', 'unknown')
                if p not in providers:
                    providers[p] = []
                providers[p].append(m)
            models = []
            for provider, provider_models in providers.items():
                # Add Header
                models.append({
                    "id": f"header-{provider}",
                    "name": provider.upper(),
                    "isHeader": True
                })
                # Add Models
                for m in provider_models:
                    models.append({
                        "id": m['id'],
                        "name": m['name']
                    })
            return {"models": models}
        await asyncio.sleep(0.5)

    print(f"DEBUG: Timeout reached waiting for models.list")
    return {"models": []}

@router.post("/set-model")
async def set_model(request: Request, authorization: Optional[str] = FastAPIHeader(None)):
    data = await request.json()
    session_id = data.get("sessionId")
    model = data.get("model")
    gateway_client = request.app.state.gateway_client

    # Extract username from token
    username = None
    if authorization and authorization.startswith("Bearer "):
        username = get_current_username(authorization.split(" ", 1)[1])

    session_key = build_session_key(username, session_id) if username else f"agent:main:webchat:{session_id}"

    request_id = str(uuid.uuid4())
    await gateway_client.websocket.send(json.dumps({
        "type": "req",
        "id": request_id,
        "method": "sessions.patch",
        "params": {
            "key": session_key,
            "model": model
        }
    }))

    # Wait for the response from the gateway
    if not hasattr(request.app.state, 'pending_responses'):
        request.app.state.pending_responses = {}

    timeout = 5
    start_time = asyncio.get_event_loop().time()
    while (asyncio.get_event_loop().time() - start_time) < timeout:
        resp = request.app.state.pending_responses.get(request_id)
        if resp:
            del request.app.state.pending_responses[request_id]
            # resp is: {'type': 'res', 'id': ..., 'ok': True/False, 'error': ...}
            return resp
        await asyncio.sleep(0.5)

    return {"ok": False, "error": {"message": "Timed out waiting for model update"}}

@router.post("/set-thinking-level")
async def set_thinking_level(request: Request):
    data = await request.json()
    # Expecting: {"key": "...", "agentId": "...", "thinkingLevel": "..."}
    # as per user requirements.
    # Note: Currently App.jsx sends key, agentId, and thinkingLevel.

    gateway_client = request.app.state.gateway_client

    request_id = str(uuid.uuid4())
    await gateway_client.websocket.send(json.dumps({
        "type": "req",
        "id": request_id,
        "method": "sessions.patch",
        "params": data
    }))

    # Wait for the response from the gateway
    if not hasattr(request.app.state, 'pending_responses'):
        request.app.state.pending_responses = {}

    timeout = 5
    start_time = asyncio.get_event_loop().time()
    while (asyncio.get_event_loop().time() - start_time) < timeout:
        resp = request.app.state.pending_responses.get(request_id)
        if resp:
            del request.app.state.pending_responses[request_id]
            # resp is: {'type': 'res', 'id': ..., 'ok': True/False, 'error': ...}
            return resp
        await asyncio.sleep(0.5)

    return {"ok": False, "error": {"message": "Timed out waiting for thinking level update"}}

@router.get("/get-session-model")
async def get_session_model(session_id: str, request: Request, username: str = None):
    gateway_client = request.app.state.gateway_client

    session_key = build_session_key(username, session_id) if username else f"agent:main:webchat:{session_id}"

    request_id = str(uuid.uuid4())
    await gateway_client.websocket.send(json.dumps({
        "type": "req",
        "id": request_id,
        "method": "sessions.describe",
        "params": {
            "key": session_key
        }
    }))

    # Wait for response
    timeout = 5
    start_time = asyncio.get_event_loop().time()

    # Ensure pending_responses dict exists
    if not hasattr(request.app.state, 'pending_responses'):
        request.app.state.pending_responses = {}

    while (asyncio.get_event_loop().time() - start_time) < timeout:
        resp = request.app.state.pending_responses.get(request_id)
        if resp:
            # Clean up
            del request.app.state.pending_responses[request_id]

            session_data = (resp.get('payload') or {}).get('session')
            model = session_data.get('model') if session_data else None
            return {"model": model}
        await asyncio.sleep(0.5)

    return {"model": None}

async def get_session_data(session_id: str, request: Request, username: str = None):
    gateway_client = request.app.state.gateway_client

    session_key = build_session_key(username, session_id) if username else f"agent:main:webchat:{session_id}"

    request_id = str(uuid.uuid4())
    await gateway_client.websocket.send(json.dumps({
        "type": "req",
        "id": request_id,
        "method": "sessions.describe",
        "params": {
            "key": session_key
        }
    }))

    # Wait for response
    timeout = 5
    start_time = asyncio.get_event_loop().time()

    if not hasattr(request.app.state, 'pending_responses'):
        request.app.state.pending_responses = {}

    while (asyncio.get_event_loop().time() - start_time) < timeout:
        resp = request.app.state.pending_responses.get(request_id)
        if resp:
            del request.app.state.pending_responses[request_id]
            session = (resp.get('payload') or {}).get('session') or {}
            return {
                "thinkingLevel": session.get("thinkingLevel"),
                "thinkingLevels": session.get("thinkingLevels")
            }
        await asyncio.sleep(0.5)

    return {"thinkingLevel": None, "thinkingLevels": []}

