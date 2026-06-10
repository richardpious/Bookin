from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Dict
import sys
import os
# Ensure the parent directory is in sys.path so we can import 'models'
sys.path.append(os.path.dirname(os.path.abspath(__file__)))
from models.chat_request import ChatRequest
from models.agent_bridge import OpenClawAgentBridge
from chat_history import ChatHistoryDB
import asyncio
import uvicorn
import json
import subprocess

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class ConnectionManager:
    def __init__(self):
        self.active_connections: Dict[str, WebSocket] = {}

    async def connect(self, client_id: str, websocket: WebSocket):
        await websocket.accept()
        self.active_connections[client_id] = websocket

    def disconnect(self, client_id: str):
        if client_id in self.active_connections:
            del self.active_connections[client_id]

    async def send_personal_message(self, message: dict, client_id: str):
        if client_id in self.active_connections:
            await self.active_connections[client_id].send_json(message)

manager = ConnectionManager()

class AgentEventRequest(BaseModel):
    session: str
    event: str
    data: dict

agent_bridge = OpenClawAgentBridge()
chat_db = ChatHistoryDB()


@app.post("/internal/agent-event")
async def agent_event(payload: AgentEventRequest):
    print(f"AGENT EVENT RECEIVED: {payload}")
    await manager.send_personal_message(
        {"type": payload.event, "data": payload.data},
        payload.session
                )
    return {"status": "ok"}


@app.get("/files")
async def list_files(path: str = "."):
    # Root directory is the project root
    root_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))

    # Secure the requested path
    target_dir = os.path.normpath(os.path.join(root_dir, path))

    if not target_dir.startswith(root_dir):
        return {"error": "Access denied"}

    if not os.path.isdir(target_dir):
        return {"error": "Not a directory"}

    # Define directories to hide
    hidden_dirs = [".git", ".venv", "__pycache__", "node_modules", "platform", "agent", "package-lock.json", "package.json", "chat_history.db"]

    files = []
    try:
        # Get directory contents and sort them: directories first, then files, both alphabetical
        items = sorted(os.listdir(target_dir))

        # Filter and organize items
        dir_list = []
        file_list = []

        for name in items:
            if name.startswith(".") or name in hidden_dirs:
                continue

            full_path = os.path.join(target_dir, name)
            is_dir = os.path.isdir(full_path)
            rel_path = os.path.relpath(full_path, root_dir)

            item_data = {
                "name": name,
                "path": rel_path,
                "isDir": is_dir
            }
            if is_dir:
                dir_list.append(item_data)
            else:
                file_list.append(item_data)

        files = dir_list + file_list

    except PermissionError:
        return {"error": "Permission denied"}

    return {"files": files}

@app.get("/sessions")
async def list_sessions():
    return {"sessions": chat_db.get_all_sessions()}

@app.get("/file")
async def get_file(path: str):
    root_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
    target_path = os.path.normpath(os.path.join(root_dir, path))

    if not target_path.startswith(root_dir):
        return {"error": "Access denied"}

    if not os.path.isfile(target_path):
        return {"error": "Not a file"}
    try:
        with open(target_path, 'r', encoding='utf-8') as f:
            content = f.read()
        return {"content": content}
    except Exception as e:
        return {"error": str(e)}


@app.post("/chat")
async def chat_endpoint(request: ChatRequest):

    session_key = f"webchat:{request.session_id}"
    try:
        # Save user message
        chat_db.add_message(request.session_id, "user", request.message)

        response = await agent_bridge.send_message(
            request.message,
            session_key,
        )

        # Save agent response
        chat_db.add_message(request.session_id, "agent", response)
        return {
            "message": response
        }
    except Exception as e:
        return {
            "error": str(e)
        }

@app.get("/history/{session_id}")
async def get_history(session_id: str):
    return {"history": chat_db.get_history(session_id)}

@app.post("/reset_session/{session_id}")
async def reset_session(session_id: str):
    try:
        # Reset in openclaw
        proc = await asyncio.create_subprocess_exec(
            "openclaw",
            "sessions",
            "reset",
            f"webchat:{session_id}",
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE,
        )
        stdout, stderr = await proc.communicate()
        if proc.returncode != 0:
            return {"error": stderr.decode()}

        # Reset in DB
        chat_db.reset_session(session_id)

        return {"status": "success"}
    except Exception as e:
        return {"error": str(e)}


@app.websocket("/ws/{client_id}")
async def websocket_endpoint(
    websocket: WebSocket,
    client_id: str,
):
    await manager.connect(client_id, websocket)

    session_key = f"webchat:{client_id}"

    try:
        while True:
            # This loop waits for messages from the frontend.
            # If your tool is causing an error here, it might crash the loop.
            message = await websocket.receive_text()
            try:
                # Save user message
                chat_db.add_message(client_id, "user", message)

                response = await agent_bridge.send_message(
                    message,
                    session_key,
                )

                # Save agent response
                chat_db.add_message(client_id, "agent", response)

                # Check if the response starts with the WEB_SOCKET_SEND prefix
                if response.strip().startswith("WEB_SOCKET_SEND: "):
                    json_str = response.split("WEB_SOCKET_SEND: ", 1)[1]
                    await websocket.send_text(json_str)
                else:
                    await websocket.send_text(
                        json.dumps(
                            {
                                "type": "chunk",
                                "message": response
                        }
                    )
                    )
                    await websocket.send_text(json.dumps({"type": "done"}))

            except Exception as e:
                # Send error message back to client instead of crashing
                print(f"Error processing chat message: {e}")
                await websocket.send_text(
                    json.dumps(
                        {
                            "type": "error",
                            "message": str(e)
                        }
                    )
                )

    except WebSocketDisconnect:
        manager.disconnect(client_id)
        print(f"Client {client_id} disconnected")
    except Exception as e:
        # Catch other exceptions like connection errors
        print(f"WebSocket error for {client_id}: {e}")
        manager.disconnect(client_id)


if __name__ == "__main__":
    uvicorn.run(
        app,
        host="127.0.0.1",
        port=8000,
    )

