from fastapi import APIRouter, Request
from pydantic import BaseModel

router = APIRouter(prefix="/internal", tags=["internal"])


class FilePreviewRequest(BaseModel):
    filepath: str
    session_key: str = ""


@router.post("/file-preview")
async def file_preview(body: FilePreviewRequest, request: Request):
    """Called directly by the file-open plugin execute() function."""
    manager = request.app.state.manager
    session_key = body.session_key

    for client_id, ws in manager.active_connections.items():
        if not session_key or f"agent:main:webchat:{client_id}" in session_key:
            await manager.send_personal_message({
                "type": "file-preview",
                "data": body.filepath
            }, client_id)

    return {"ok": True}
