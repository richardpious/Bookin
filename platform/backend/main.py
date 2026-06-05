from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import asyncio
import uvicorn
import json

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


import asyncio
import json

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

            response = await agent_bridge.send_message(
                message,
                session_key,
            )

            await websocket.send_text(
                json.dumps(
                    {
                        "message": response
                    }
                )
            )

    except WebSocketDisconnect:
        print(f"Client {client_id} disconnected")


if __name__ == "__main__":
    uvicorn.run(
        app,
        host="127.0.0.1",
        port=3000,
    )
