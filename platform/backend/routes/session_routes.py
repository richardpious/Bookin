from fastapi import APIRouter, Request

router = APIRouter()

@router.get("/sessions")
async def list_sessions(request: Request):
    return {"sessions": request.app.state.chat_db.get_all_sessions()}

@router.post("/delete_session/{session_id}")
async def delete_session(request: Request, session_id: str):
    manager = request.app.state.manager
    chat_db = request.app.state.chat_db
    agent_bridge = request.app.state.agent_bridge
    try:
        if session_id in manager.active_connections:
            await manager.active_connections[session_id].send_json({"type": "command", "action": "reset"})

        # Send reset command to openclaw
        try:
            # sessionId is just the UUID
            await agent_bridge.send_message("/reset", session_id)
        except Exception as e:
            print(f"Warning: Failed to reset openclaw agent session {session_id}: {e}")

        chat_db.delete_session(session_id)
        return {"status": "success"}
    except Exception as e:
        return {"error": str(e)}

