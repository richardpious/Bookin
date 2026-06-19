from fastapi import APIRouter, Request
import uuid
import json
import asyncio

router = APIRouter()

# Global variable to store models, ideally should be handled better
available_models = []

@router.get("/available-models")
async def get_models(request: Request):
    gateway_client = request.app.state.gateway_client

    # Send request if not available yet
    request_id = str(uuid.uuid4())
    print(f"DEBUG: Sending models.authStatus with ID: {request_id}")
    await gateway_client.websocket.send(json.dumps({
        "type": "req",
        "id": request_id,
        "method": "models.list",
        "params": {}
    }))
    
    # Reset latest response before waiting
    request.app.state.latest_models_response = None

    # Wait for response (up to a timeout)
    timeout = 5
    start_time = asyncio.get_event_loop().time()
    while (asyncio.get_event_loop().time() - start_time) < timeout:
        if hasattr(request.app.state, 'latest_models_response'):
            resp = request.app.state.latest_models_response
            if resp and resp.get("id") == request_id:
                models_data = resp['payload'].get('models', [])

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

    print(f"DEBUG: Timeout reached waiting for models.authStatus")
    return {"models": []}

