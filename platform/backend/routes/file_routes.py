from fastapi import APIRouter, Request
import os

router = APIRouter()

@router.get("/files")
async def list_files(path: str = "."):
    root_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..', '..'))
    target_dir = os.path.normpath(os.path.join(root_dir, path))

    if not target_dir.startswith(root_dir):
        return {"error": "Access denied"}

    if not os.path.isdir(target_dir):
        return {"error": "Not a directory"}

    hidden_dirs = [".git", ".venv", "__pycache__", "node_modules", "platform", "agent", "package-lock.json", "package.json", "chat_history.db"]
    files = []
    try:
        items = sorted(os.listdir(target_dir))
        dir_list = []
        file_list = []
        for name in items:
            if name.startswith(".") or name in hidden_dirs:
                continue
            full_path = os.path.join(target_dir, name)
            is_dir = os.path.isdir(full_path)
            rel_path = os.path.relpath(full_path, root_dir)
            item_data = {"name": name, "path": rel_path, "isDir": is_dir}
            if is_dir: dir_list.append(item_data)
            else: file_list.append(item_data)
        files = dir_list + file_list
    except PermissionError:
        return {"error": "Permission denied"}
    return {"files": files}

@router.get("/file")
async def get_file(path: str):
    root_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..', '..'))
    target_path = os.path.normpath(os.path.join(root_dir, path))

    if not target_path.startswith(root_dir):
        return {"error": "Access denied"}

    if not os.path.isfile(target_path):
        return {"error": "Not a file"}
    try:
        with open(target_path, 'r', encoding='utf-8') as f:
            content = f.read()
        return {"content": content}
    except Exception as e:
        return {"error": str(e)}
