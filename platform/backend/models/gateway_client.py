import asyncio
import json
import uuid
import websockets
import logging
import os

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("GatewayClient")

class OpenClawGatewayClient:
    def __init__(self, url="ws://127.0.0.1:18789",
                 token=None):
        self.url = url
        self.token = token or os.environ.get("OPENCLAW_GATEWAY_TOKEN", "34e4d57af2be264ad2f405c588ba4d26c79a1cd5ea7ebece")
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

    async def send_agent_message(self, message: str, session_id: str, username: str = None):
        """Sends a message or command to the OpenClaw Gateway."""
        if not self.websocket:
            raise Exception("Gateway WebSocket is not connected.")
        
        # Build session key with username for per-user isolation
        if username:
            session_key = f"agent:main:{username}:{session_id}"
            openclaw_session_id = f"{username}:{session_id}"
        else:
            session_key = f"agent:main:webchat:{session_id}"
            openclaw_session_id = session_id
        
        payload = {
            "type": "req",
            "id": str(uuid.uuid4()),
            "method": "chat.send",
            "params": {
                "sessionKey": session_key,
                "sessionId": openclaw_session_id,
                "message": message,
                "deliver": False,
                "idempotencyKey": str(uuid.uuid4())
            }
        }
        await self.websocket.send(json.dumps(payload))

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
                        event_name = data.get("event", "")
                        event_payload = data.get("payload", {})
                        session_key = event_payload.get("sessionKey", "") if isinstance(event_payload, dict) else ""
                        
                        # Persist tool execution events to DB for long-term history
                        if event_name == "agent":
                            evt_data = event_payload.get("data", {})
                            stream = event_payload.get("stream", "")
                            
                            if stream == "item" and evt_data.get("kind") == "tool" and evt_data.get("phase") == "start":
                                if session_key and ":" in session_key:
                                    parts = session_key.split(":")
                                    if len(parts) >= 4:
                                        db_session_id = parts[-1]
                                        tool_json = json.dumps({
                                            "toolCallId": evt_data.get("toolCallId"),
                                            "title": evt_data.get("title", ""),
                                            "name": evt_data.get("name", ""),
                                            "meta": evt_data.get("meta", {})
                                        })
                                        manager.app.state.chat_db.add_message(db_session_id, "tool", tool_json)

                        forward_packet = {"type": "gateway_log", "payload": data}
                        for client_id in manager.active_connections:
                            if not session_key or f"agent:main:{client_id}" in session_key:
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

                            session_key = chat_payload.get("sessionKey", "")
                            state = chat_payload.get("state")

                            for client_id, ws in manager.active_connections.items():
                                if f"agent:main:{client_id}" in session_key:
                                    # Extract plain session_id from compound key "username:session_id"
                                    db_session_id = client_id.split(":", 1)[1] if ":" in client_id else client_id
                                    
                                    if state == "delta" and (text or reasoning):
                                        payload = {"type": "chunk", "message": text}
                                        if reasoning:
                                            payload["reasoning"] = reasoning
                                        await manager.send_personal_message(payload, client_id)

                                    elif state in ["final", "done", "complete"]:
                                        full_text = ""
                                        if "message" in chat_payload:
                                            content = chat_payload["message"].get("content", [])
                                            if content and isinstance(content, list):
                                                full_text = content[0].get("text", "") if content[0].get("type") == "text" else ""
                                        if full_text:
                                            chat_db = manager.app.state.chat_db
                                            chat_db.add_message(db_session_id, "agent", full_text)
                                        await manager.send_personal_message({"type": "done"}, client_id)

                                    elif state == "error":
                                        error_message = chat_payload.get("errorMessage", "unknown error")
                                        
                                        if "Exec failed:" in error_message or "⚠️ 🛠️" in error_message:
                                            logger.info(f"Filtered out internal tool error for {client_id}")
                                            continue
                                            
                                        logger.warning(f"Agent run error for session {client_id}: {error_message}")
                                        # Persist the error to chat history with a clear prefix
                                        chat_db = manager.app.state.chat_db
                                        chat_db.add_message(db_session_id, "agent", f"[Error] {error_message}")
                                        # Forward the raw error to the frontend for classification/display
                                        await manager.send_personal_message(
                                            {"type": "error", "message": error_message},
                                            client_id
                                        )


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