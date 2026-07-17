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
    
    # Extract plain session_id if compound key "username:session_id" is passed
    db_session_id = log.sessionId.split(":", 1)[1] if ":" in log.sessionId else log.sessionId
    
    chat_db.add_message(db_session_id, log.sender, log.text)
    return {"status": "success"}
