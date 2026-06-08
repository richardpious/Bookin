from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import asyncio
import uvicorn
import json
import os

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class ChatRequest(BaseModel):
    message: str
    session_id: str = "default"


class OpenClawAgentBridge:
    async def send_message(
        self,
        message: str,
        session_key: str,
    ) -> str:

        proc = await asyncio.create_subprocess_exec(
            "openclaw",
            "agent",
            "--agent",
            "main",
            "--session-key",
            session_key,
            "--message",
            message,
            "--json",
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE,
        )

        stdout, stderr = await proc.communicate()

        if proc.returncode != 0:
            raise Exception(stderr.decode())

        result = json.loads(stdout.decode())

        return result["result"]["payloads"][0]["text"]
    


agent_bridge = OpenClawAgentBridge()


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
    hidden_dirs = [".git", ".venv", "__pycache__", "node_modules", "platform", "agent", "package-lock.json", "package.json"]

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


@app.post("/chat")
async def chat_endpoint(request: ChatRequest):

    session_key = f"webchat:{request.session_id}"

    try:
        response = await agent_bridge.send_message(
            request.message,
            session_key,
        )

        return {
            "message": response
        }

    except Exception as e:
        return {
            "error": str(e)
        }


@app.websocket("/ws/{client_id}")
async def websocket_endpoint(
    websocket: WebSocket,
    client_id: str,
):
    await websocket.accept()

    session_key = f"webchat:{client_id}"

    try:
        while True:
            message = await websocket.receive_text()

            try:
                response = await agent_bridge.send_message(
                    message,
                    session_key,
                )

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
                await websocket.send_text(
                    json.dumps(
                        {
                            "type": "error",
                            "message": str(e)
                        }
                    )
                )

    except WebSocketDisconnect:
        print(f"Client {client_id} disconnected")


if __name__ == "__main__":
    uvicorn.run(
        app,
        host="127.0.0.1",
        port=8000,
    )

