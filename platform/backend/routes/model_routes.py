from fastapi import APIRouter, Request
import uuid
import json
import asyncio

router = APIRouter()

# Global variable to store models, ideally should be handled better
available_models = []

@router.get("/init-session")
async def init_session(session_id: str, request: Request):
    # 1. Fetch available models
    models_response = await get_models(request)

    # 2. Fetch session model
    session_model_response = await get_session_model(session_id, request)

    return {
        "models": models_response.get("models", []),
        "model": session_model_response.get("model")
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
async def set_model(request: Request):
    data = await request.json()
    session_id = data.get("sessionId")
    model = data.get("model")
    gateway_client = request.app.state.gateway_client

    await gateway_client.websocket.send(json.dumps({
        "type": "req",
        "id": str(uuid.uuid4()),
        "method": "sessions.patch",
        "params": {
            "key": f"agent:main:webchat:{session_id}",
            "model": model
        }
    }))
    return {"status": "ok"}

@router.get("/get-session-model")
async def get_session_model(session_id: str, request: Request):
    gateway_client = request.app.state.gateway_client

    request_id = str(uuid.uuid4())
    await gateway_client.websocket.send(json.dumps({
        "type": "req",
        "id": request_id,
        "method": "sessions.describe",
        "params": {
            "key": f"agent:main:webchat:{session_id}"
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

