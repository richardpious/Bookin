from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from chat_history import ChatHistoryDB
from models.agent_bridge import OpenClawAgentBridge
from models.connection_manager import ConnectionManager
from routes import chat_routes, file_routes, session_routes, ws_routes, event_routes

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
# Initialize components
manager = ConnectionManager()
chat_db = ChatHistoryDB()
agent_bridge = OpenClawAgentBridge()

# Add dependencies to app state for access in routers
app.state.manager = manager
app.state.chat_db = chat_db
app.state.agent_bridge = agent_bridge

app.include_router(chat_routes.router)
app.include_router(file_routes.router)
app.include_router(session_routes.router)
app.include_router(ws_routes.router)
app.include_router(event_routes.router)

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="127.0.0.1", port=8000)

