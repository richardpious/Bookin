from fastapi import APIRouter, Request, Depends, Header as FastAPIHeader
from typing import Optional
import uuid
import json
import asyncio
import logging
from .auth_routes import get_optional_username_from_header, build_session_key

logger = logging.getLogger("ModelRoutes")

router = APIRouter()

import time

@router.get("/init-session")
async def init_session(session_id: str, request: Request, username: Optional[str] = Depends(get_optional_username_from_header)):

    # 1. Fetch available models
    models_response = await get_models(request, username)

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
async def get_models(request: Request, username: Optional[str] = Depends(get_optional_username_from_header)):
    # Cache models for 5 minutes
    CACHE_TTL = 300
    current_time = time.time()
    if request.app.state.models_cache and (current_time - request.app.state.models_cache_time < CACHE_TTL):
        return {"models": request.app.state.models_cache}

    gateway_client = request.app.state.gateway_client

    request_id = str(uuid.uuid4())
    logger.debug(f"Sending models.list with ID: {request_id}")
    await gateway_client.websocket.send(json.dumps({
        "type": "req",
        "id": request_id,
        "method": "models.list",
        "params": {"view": "all"}
    }))
    
    # Wait for response using asyncio.Event
    event = asyncio.Event()
    request.app.state.pending_responses[request_id] = {"event": event, "data": None}

    try:
        await asyncio.wait_for(event.wait(), timeout=5.0)
        resp = request.app.state.pending_responses[request_id]["data"]
    except asyncio.TimeoutError:
        resp = None
    finally:
        del request.app.state.pending_responses[request_id]

    if resp:
        payload = resp.get('payload') or {}
        models_data = payload.get('models', [])

        # Filter to strictly display gemini-3.1-flash-lite and nemotron models
        filtered_models = [
            m for m in models_data
            if "gemini-3.1-flash-lite" in m.get('key', m.get('id', '')).lower() or "nemotron" in m.get('key', m.get('id', '')).lower()
        ]

        # Group models by provider
        providers = {}
        for m in filtered_models:
            key = m.get('key', m.get('id', ''))
            parts = key.split('/', 1)
            p = parts[0] if len(parts) > 1 else 'unknown'
            
            # fallback for old provider field just in case
            p = m.get('provider', p)
            
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
                raw_id = m.get('key', m.get('id', ''))
                models.append({
                    "id": f"{provider}/{raw_id}" if '/' not in raw_id else raw_id,
                    "name": m.get('name', '')
                })
        request.app.state.models_cache = models
        request.app.state.models_cache_time = time.time()
        return {"models": models}
        
    return {"models": []}

@router.post("/set-model")
async def set_model(request: Request, body: dict, username: Optional[str] = Depends(get_optional_username_from_header)):
    session_id = body.get("sessionId")
    model = body.get("model")
    gateway_client = request.app.state.gateway_client

    if username:
        session_key = build_session_key(username, session_id)
        await gateway_client.ensure_user_agent(username)
    else:
        session_key = f"main:{session_id}"

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

    # Wait for response using asyncio.Event
    event = asyncio.Event()
    request.app.state.pending_responses[request_id] = {"event": event, "data": None}

    try:
        await asyncio.wait_for(event.wait(), timeout=5.0)
        resp = request.app.state.pending_responses[request_id]["data"]
        return resp
    except asyncio.TimeoutError:
        return {"ok": False, "error": {"message": "Timed out waiting for model update"}}
    finally:
        request.app.state.pending_responses.pop(request_id, None)

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

    # Wait for response using asyncio.Event
    event = asyncio.Event()
    request.app.state.pending_responses[request_id] = {"event": event, "data": None}

    try:
        await asyncio.wait_for(event.wait(), timeout=5.0)
        resp = request.app.state.pending_responses[request_id]["data"]
        return resp
    except asyncio.TimeoutError:
        return {"ok": False, "error": {"message": "Timed out waiting for thinking level update"}}
    finally:
        request.app.state.pending_responses.pop(request_id, None)

@router.get("/get-session-model")
async def get_session_model(session_id: str, request: Request, username: str = None):
    gateway_client = request.app.state.gateway_client

    session_key = build_session_key(username, session_id) if username else f"main:{session_id}"

    request_id = str(uuid.uuid4())
    await gateway_client.websocket.send(json.dumps({
        "type": "req",
        "id": request_id,
        "method": "sessions.describe",
        "params": {
            "key": session_key
        }
    }))

    # Wait for response using asyncio.Event
    event = asyncio.Event()
    request.app.state.pending_responses[request_id] = {"event": event, "data": None}

    try:
        await asyncio.wait_for(event.wait(), timeout=5.0)
        resp = request.app.state.pending_responses[request_id]["data"]
        session_data = (resp.get('payload') or {}).get('session')
        model = session_data.get('model') if session_data else None
        return {"model": model}
    except asyncio.TimeoutError:
        return {"model": None}
    finally:
        request.app.state.pending_responses.pop(request_id, None)

async def get_session_data(session_id: str, request: Request, username: str = None):
    gateway_client = request.app.state.gateway_client

    session_key = build_session_key(username, session_id) if username else f"main:{session_id}"

    request_id = str(uuid.uuid4())
    await gateway_client.websocket.send(json.dumps({
        "type": "req",
        "id": request_id,
        "method": "sessions.describe",
        "params": {
            "key": session_key
        }
    }))

    # Wait for response using asyncio.Event
    event = asyncio.Event()
    request.app.state.pending_responses[request_id] = {"event": event, "data": None}

    try:
        await asyncio.wait_for(event.wait(), timeout=5.0)
        resp = request.app.state.pending_responses[request_id]["data"]
        session = (resp.get('payload') or {}).get('session') or {}
        return {
            "thinkingLevel": session.get("thinkingLevel"),
            "thinkingLevels": session.get("thinkingLevels")
        }
    except asyncio.TimeoutError:
        return {"thinkingLevel": None, "thinkingLevels": []}
    finally:
        request.app.state.pending_responses.pop(request_id, None)

