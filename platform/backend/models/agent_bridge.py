import asyncio
import json

# Remove the old CLI-based logic and use the gateway_client instead
class OpenClawAgentBridge:
    def __init__(self, gateway_client):
        self.gateway_client = gateway_client

    async def send_message(self, message: str, session_id: str):
        # The gateway_client is now handling the communication
        # We can keep this interface if needed, but it should now route through gateway_client
        import uuid
        payload = {
            "type": "req",
            "id": str(uuid.uuid4()),
            "method": "chat.send",
            "params": {
                "sessionKey": "agent:main:webchat" + f":{session_id}",
                "sessionId": session_id,
                "message": message,
                "deliver": False,
                "idempotencyKey": str(uuid.uuid4())
            }
        }
        await self.gateway_client.websocket.send(json.dumps(payload))

    async def send(self, session_key: str, event_data: dict):
        pass

