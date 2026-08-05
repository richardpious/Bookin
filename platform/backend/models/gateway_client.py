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
        self.pending_chat_requests = {}  # req_id -> compound_key
        self.active_runs = {}  # compound_key -> req_info for retries

    async def connect(self):
        """Connects to the Gateway and performs the mandatory handshake."""
        try:
            self.websocket = await websockets.connect(
                self.url, ping_interval=20, ping_timeout=20
            )
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

    async def delayed_unlock(self, manager, client_id, delay=1.0):
        """Safely unlocks the session after a small delay to allow OpenClaw to commit disk writes."""
        await asyncio.sleep(delay)
        manager.app.state.busy_sessions.discard(client_id)
        if hasattr(self, 'active_runs') and client_id in self.active_runs:
            del self.active_runs[client_id]

    async def send_agent_message(self, message: str, session_id: str, username: str = None):
        """Sends a message or command to the OpenClaw Gateway."""
        if not self.websocket:
            raise Exception("Gateway WebSocket is not connected.")
        
        # Build session key with username for per-user isolation
        if username:
            session_key = f"subagent:main:{username}:{session_id}"
            openclaw_session_id = f"{username}:{session_id}"
        else:
            session_key = f"subagent:main:webchat:{session_id}"
            openclaw_session_id = session_id
        
        req_id = str(uuid.uuid4())
        payload = {
            "type": "req",
            "id": req_id,
            "method": "chat.send",
            "params": {
                "sessionKey": session_key,
                "sessionId": openclaw_session_id,
                "message": message,
                "deliver": False,
                "idempotencyKey": str(uuid.uuid4())
            }
        }
        self.pending_chat_requests[req_id] = {
            "compound_key": openclaw_session_id,
            "payload": payload,
            "retry_count": 0
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
                    request_id = data.get("id")

                    if manager and hasattr(manager, 'app'):
                        if not hasattr(manager.app.state, 'pending_responses'):
                            manager.app.state.pending_responses = {}
                        manager.app.state.pending_responses[request_id] = data

                    # If this is a response to a chat.send request
                    if request_id in self.pending_chat_requests:
                        req_info = self.pending_chat_requests.pop(request_id)
                        if isinstance(req_info, dict):
                            compound_key = req_info.get("compound_key", "")
                            payload = req_info.get("payload")
                            retry_count = req_info.get("retry_count", 0)
                        else:
                            compound_key = req_info
                            payload = None
                            retry_count = 0

                        if not data.get("ok"):
                            err_info = data.get("error", {})
                            err_msg = err_info.get("message", "Failed to start agent run")

                            if "initialization conflicted" in err_msg.lower():
                                logger.info(f"Session initialization conflicted for {compound_key}. Session is locked by a background process. Triggering abort.")
                                abort_req_id = str(uuid.uuid4())
                                session_key = payload.get("params", {}).get("sessionKey") if payload else None
                                if session_key:
                                    abort_payload = {
                                        "type": "req",
                                        "id": abort_req_id,
                                        "method": "chat.abort",
                                        "params": {
                                            "sessionKey": session_key,
                                        }
                                    }
                                    try:
                                        await self.websocket.send(json.dumps(abort_payload))
                                    except Exception as e:
                                        logger.error(f"Failed to send abort for locked session: {e}")
                                err_msg = "The session was locked by a background process. It has been forcefully aborted. Please try sending your message again in a moment."
                                # Fall through to the error handler below
                            logger.warning(f"chat.send rejected for {compound_key}: {err_msg}")
                            if manager and hasattr(manager, 'app'):
                                manager.app.state.busy_sessions.discard(compound_key)
                                chat_db = manager.app.state.chat_db
                                db_session_id = compound_key.split(":", 1)[1] if ":" in compound_key else compound_key
                                chat_db.add_message(db_session_id, "agent", f"[Error] {err_msg}")
                                await manager.send_personal_message(
                                    {"type": "error", "message": err_msg},
                                    compound_key
                                )
                        else:
                            if hasattr(self, 'active_runs'):
                                self.active_runs[compound_key] = {
                                    "compound_key": compound_key,
                                    "payload": payload,
                                    "retry_count": retry_count
                                }

                    if manager and hasattr(manager, 'app'):
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
                            evt_data = event_payload.get("data", {}) if isinstance(event_payload, dict) else {}
                            stream = event_payload.get("stream", "") if isinstance(event_payload, dict) else ""
                            
                            is_tool_event = (stream == "item" and (evt_data.get("kind") == "tool" or evt_data.get("kind") == "command")) or (stream == "tool")
                            if is_tool_event:
                                if session_key and ":" in session_key:
                                    parts = session_key.split(":")
                                    if len(parts) >= 4:
                                        db_session_id = parts[-1]
                                        tool_call_id = evt_data.get("toolCallId") or evt_data.get("itemId") or evt_data.get("id")
                                        if tool_call_id:
                                            tool_data = {
                                                "toolCallId": tool_call_id,
                                                "title": evt_data.get("title") or evt_data.get("name") or "",
                                                "name": evt_data.get("name") or evt_data.get("title") or "",
                                            }
                                            meta_val = evt_data.get("meta") or evt_data.get("args")
                                            if meta_val:
                                                tool_data["meta"] = meta_val
                                            if evt_data.get("phase"):
                                                tool_data["phase"] = evt_data.get("phase")
                                            if "status" in evt_data:
                                                tool_data["status"] = evt_data.get("status")
                                            if "isError" in evt_data:
                                                tool_data["isError"] = evt_data.get("isError")
                                            
                                            result_val = None
                                            for k in ["result", "output", "progressText", "partialResult", "details", "content", "text", "error"]:
                                                if k in evt_data and evt_data[k] is not None:
                                                    result_val = evt_data[k]
                                                    break
                                            if result_val is not None:
                                                tool_data["result"] = result_val

                                            manager.app.state.chat_db.update_tool_message(db_session_id, tool_call_id, tool_data)


                        forward_packet = {"type": "gateway_log", "payload": data}
                        for client_id in manager.active_connections:
                            if not session_key or f"subagent:main:{client_id}" in session_key:
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
                                if f"subagent:main:{client_id}" in session_key:
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
                                        # Clear busy flag safely after agent run finished
                                        asyncio.create_task(self.delayed_unlock(manager, client_id))
                                        await manager.send_personal_message({"type": "done"}, client_id)

                                    elif state == "error":
                                        error_message = chat_payload.get("errorMessage", "unknown error")
                                        
                                        if "Exec failed:" in error_message or "⚠️ 🛠️" in error_message:
                                            logger.info(f"Filtered out internal tool error for {client_id}")
                                            continue

                                        if "initialization conflicted" in error_message.lower():
                                            logger.info(f"Session initialization conflicted for {client_id} (async). Session is locked by a background process. Triggering abort.")
                                            req_info = getattr(self, 'active_runs', {}).get(client_id)
                                            if req_info:
                                                payload = req_info.get("payload")
                                                if payload:
                                                    session_key = payload.get("params", {}).get("sessionKey")
                                                    if session_key:
                                                        abort_req_id = str(uuid.uuid4())
                                                        abort_payload = {
                                                            "type": "req",
                                                            "id": abort_req_id,
                                                            "method": "chat.abort",
                                                            "params": {
                                                                "sessionKey": session_key,
                                                            }
                                                        }
                                                        try:
                                                            await self.websocket.send(json.dumps(abort_payload))
                                                        except Exception as e:
                                                            logger.error(f"Failed to send abort for locked session: {e}")
                                            
                                            error_message = "The session was locked by a background process. It has been forcefully aborted. Please try sending your message again in a moment."
                                            # Fall through to the error handler below

                                        logger.warning(f"Agent run error for session {client_id}: {error_message}")
                                        # Clear busy flag safely after agent run errored out
                                        asyncio.create_task(self.delayed_unlock(manager, client_id))
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