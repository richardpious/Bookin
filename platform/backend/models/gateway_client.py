import asyncio
import json
import uuid
import websockets
import logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("GatewayClient")

class OpenClawGatewayClient:
    def __init__(self, url="ws://host.docker.internal:18789",
                 token="34e4d57af2be264ad2f405c588ba4d26c79a1cd5ea7ebece"):
        self.url = url
        self.token = token
        self.websocket = None

    async def connect(self):
        """Connects to the Gateway and performs the mandatory handshake."""
        try:
            self.websocket = await websockets.connect(self.url)
            logger.info("Connected to OpenClaw Gateway WebSocket.")

            # 1. Wait for challenge
            challenge_msg = await self.websocket.recv()
            challenge = json.loads(challenge_msg)
            logger.debug(f"Received challenge: {challenge}")

            # 2. Perform Handshake
            handshake = {
                "type": "req",
                "id": str(uuid.uuid4()),
                "method": "connect",
                "params": {
                    "minProtocol": 3,
                    "maxProtocol": 4,
                    "client": {
                        "id": "gateway-client",
                        "version": "0.1.0",
                        "platform": "linux",
                        "mode": "backend"
                    },
                    "role": "operator",
                    "scopes": ["operator.read", "operator.write", "operator.admin"],
                    "auth": {"token": self.token}
                }
            }
            await self.websocket.send(json.dumps(handshake))
            
            # 3. Wait for hello-ok
            response = await self.websocket.recv()
            logger.info(f"Handshake complete ")
            
        except Exception as e:
            logger.error(f"Failed to connect to gateway: {e}")
            raise

    async def listen(self, manager=None):
        """Main loop to listen for events and optionally broadcast to the frontend."""
        if not self.websocket:
            await self.connect()

        async for message in self.websocket:
            try:
                data = json.loads(message)

                # Handle responses to our requests
                if data.get("type") == "res":
                    logger.info(f"Received response: {data}")
                    if manager and hasattr(manager, 'app'):
                        request_id = data.get("id")
                        if not hasattr(manager.app.state, 'pending_responses'):
                            manager.app.state.pending_responses = {}
                        manager.app.state.pending_responses[request_id] = data

                if manager:
                    # Forward all events as gateway logs to the frontend
                    if data.get("type") == "event":
                        forward_packet = {"type": "gateway_log", "payload": data}
                        for client_id in manager.active_connections:
                            await manager.send_personal_message(forward_packet, client_id)

                        # Handle chat events to stream text to the UI
                        if data.get("event") == "chat":
                            chat_payload = data.get("payload", {})
                            reasoning = chat_payload.get("reasoning", "")

                            text = ""
                            if "deltaText" in chat_payload:
                                text = chat_payload["deltaText"]
                            elif "message" in chat_payload:
                                content = chat_payload["message"].get("content", [])
                                if content and isinstance(content, list):
                                    text = content[0].get("text", "") if content[0].get("type") == "text" else ""

                            if text or reasoning:
                                session_key = chat_payload.get("sessionKey", "")
                                for client_id, ws in manager.active_connections.items():
                                    if f"agent:main:webchat:{client_id}" in session_key:
                                        state = chat_payload.get("state")
                                        if state == "delta":
                                            payload = {"type": "chunk", "message": text}
                                            if reasoning:
                                                payload["reasoning"] = reasoning
                                            await manager.send_personal_message(payload, client_id)
                                        elif state in ["final", "done", "complete"]:
                                            full_text = ""
                                            if "message" in chat_payload:
                                                content = chat_payload["message"].get("content", [])
                                                if content and isinstance(content, list):
                                                    full_text = content[0].get("text", "")
                                            if full_text:
                                                chat_db = manager.app.state.chat_db
                                                chat_db.add_message(client_id, "agent", full_text)
                                            await manager.send_personal_message({"type": "done"}, client_id)

            except Exception as e:
                logger.error(f"Error processing message: {e}")

    async def start(self, manager=None):
        while True:
            try:
                await self.listen(manager)
            except websockets.ConnectionClosed:
                logger.warning("Gateway disconnected. Retrying in 5 seconds...")
                self.websocket = None
                await asyncio.sleep(5)
            except Exception as e:
                logger.error(f"Unexpected error: {e}")
                self.websocket = None
                await asyncio.sleep(5)