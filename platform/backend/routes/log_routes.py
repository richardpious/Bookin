from fastapi import APIRouter, Request
from pydantic import BaseModel

router = APIRouter()

class LogMessage(BaseModel):
    sessionId: str
    sender: str
    text: str

@router.post("/log-message")
async def log_message(request: Request, log: LogMessage):
    chat_db = request.app.state.chat_db
    chat_db.add_message(log.sessionId, log.sender, log.text)
    return {"status": "success"}
