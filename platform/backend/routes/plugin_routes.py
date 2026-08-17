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

    for compound_key, ws in manager.active_connections.items():
        # Check if this connection belongs to the requested session (extracting the original client_id)
        original_client_id = compound_key.split(":", 1)[1] if ":" in compound_key else compound_key
        if not session_key or session_key.endswith(f":{original_client_id}"):
            username, session_id = compound_key.split(":", 1) if ":" in compound_key else ("default", compound_key)
            # Remove leading slashes to prevent absolute path issues
            safe_filepath = body.filepath.lstrip('/')
            
            if safe_filepath.startswith("runs/"):
                host_filepath = f"logs/{username}/" + safe_filepath[5:]
            elif safe_filepath.startswith("booksim/"):
                host_filepath = f"logs/{username}/{session_id}/{safe_filepath}"
            elif safe_filepath.startswith("configs/"):
                host_filepath = f"logs/{username}/{session_id}/{safe_filepath}"
            else:
                host_filepath = f"logs/{username}/{session_id}/{safe_filepath}"
            
            await manager.send_personal_message({
                "type": "file-preview",
                "data": host_filepath
            }, compound_key)

    return {"ok": True}
