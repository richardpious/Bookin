from fastapi import FastAPI, WebSocket
from fastapi.middleware.cors import CORSMiddleware
from typing import Dict
from chat_history import ChatHistoryDB
from models.agent_bridge import OpenClawAgentBridge
from routes import chat_routes, file_routes, session_routes, ws_routes
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

# Initialize components
manager = ConnectionManager()
chat_db = ChatHistoryDB()
agent_bridge = OpenClawAgentBridge()

# Add dependencies to app state for access in routers
app.state.manager = manager
app.state.chat_db = chat_db
app.state.agent_bridge = agent_bridge

# Include routers
app.include_router(chat_routes.router)
app.include_router(file_routes.router)
app.include_router(session_routes.router)
app.include_router(ws_routes.router)
if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="127.0.0.1", port=8000)

