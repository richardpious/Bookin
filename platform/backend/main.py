from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import asyncio
from chat_history import ChatHistoryDB
from models.agent_bridge import OpenClawAgentBridge
from models.connection_manager import ConnectionManager
from models.gateway_client import OpenClawGatewayClient
from models.search_engine import SearchEngine
from routes import chat_routes, file_routes, session_routes, ws_routes, event_routes, approval_routes, model_routes, search_routes, plugin_routes

app = FastAPI()

# Add CORS middleware
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
gateway_client = OpenClawGatewayClient()
agent_bridge = OpenClawAgentBridge(gateway_client)
search_engine = SearchEngine()

# Add dependencies to app state for access in routers
app.state.manager = manager
app.state.chat_db = chat_db
app.state.agent_bridge = agent_bridge
app.state.gateway_client = gateway_client
app.state.search_engine = search_engine

@app.on_event("startup")
async def startup_event():
    # Pass both manager and chat_db to the gateway_client
    manager.app = app # Hacky way to give manager access to app state
    asyncio.create_task(app.state.gateway_client.start(manager=manager))

app.include_router(chat_routes.router)
app.include_router(file_routes.router)
app.include_router(session_routes.router)
app.include_router(ws_routes.router)
app.include_router(event_routes.router)
app.include_router(approval_routes.router)
app.include_router(model_routes.router)
app.include_router(search_routes.router)
app.include_router(plugin_routes.router)

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="127.0.0.1", port=8000)

