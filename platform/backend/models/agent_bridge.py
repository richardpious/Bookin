import asyncio
import json

# Remove the old CLI-based logic and use the gateway_client instead
class OpenClawAgentBridge:
    def __init__(self, gateway_client):
        self.gateway_client = gateway_client

    async def send_message(self, message: str, session_key: str):
        # The gateway_client is now handling the communication
        # We can keep this interface if needed, but it should now route through gateway_client
        pass
    async def send(self, session_key: str, event_data: dict):
        pass

