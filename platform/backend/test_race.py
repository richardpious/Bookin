import asyncio
import uuid
import websockets
import json
import os

async def main():
    token = os.environ.get("OPENCLAW_GATEWAY_TOKEN", "34e4d57af2be264ad2f405c588ba4d26c79a1cd5ea7ebece")
    url = "ws://127.0.0.1:18789"
    ws = await websockets.connect(url)
    await ws.recv() # challenge
    handshake = {
        "type": "req",
        "id": str(uuid.uuid4()),
        "method": "connect",
        "params": {
            "minProtocol": 3,
            "maxProtocol": 4,
            "client": {"id": "test", "version": "0.1.0"},
            "role": "operator",
            "auth": {"token": token}
        }
    }
    await ws.send(json.dumps(handshake))
    print(await ws.recv()) # hello-ok

    # Modify openclaw.json
    config_path = os.path.expanduser("~/.openclaw/openclaw.json")
    with open(config_path, "r") as f:
        config = json.load(f)
    
    agent_id = "racetest"
    config["agents"]["list"].append({
        "id": agent_id,
        "workspace": "/tmp/racetest"
    })
    with open(config_path, "w") as f:
        json.dump(config, f, indent=2)
    
    # Immediately send chat
    req_id = str(uuid.uuid4())
    payload = {
        "type": "req",
        "id": req_id,
        "method": "chat.send",
        "params": {
            "sessionKey": f"agent:{agent_id}:1234",
            "sessionId": "1234",
            "message": "hello",
            "deliver": False,
            "idempotencyKey": str(uuid.uuid4())
        }
    }
    await ws.send(json.dumps(payload))
    print(await ws.recv()) # response

asyncio.run(main())
