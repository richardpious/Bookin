from fastapi import APIRouter, Request
from pydantic import BaseModel
import uuid
import json

router = APIRouter()

class ApprovalRequest(BaseModel):
    id: str
    decision: str

@router.post("/approve")
async def approve_tool(request: Request, approval: ApprovalRequest):
    gateway_client = request.app.state.gateway_client
    
    # Send the approval back to the Gateway
    await gateway_client.websocket.send(json.dumps({
        "type": "req",
        "id": str(uuid.uuid4()),
        "method": "plugin.approval.resolve",
        "params": {
            "id": approval.id,
            "decision": approval.decision
        }
    }))
    
    return {"status": "ok"}

