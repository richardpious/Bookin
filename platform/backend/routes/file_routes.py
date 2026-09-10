from fastapi import APIRouter, Body
import os
import shutil
import asyncio
import logging
from datetime import datetime, timezone
from paths import get_project_root

logger = logging.getLogger("FileRoutes")

router = APIRouter()


def _read_file_text(target_path: str) -> str:
    with open(target_path, 'r', encoding='utf-8') as f:
        return f.read()

def _write_file_text(target_path: str, content: str):
    with open(target_path, 'w', encoding='utf-8') as f:
        f.write(content)


def get_root_dir():
    return get_project_root()

@router.get("/files")
async def list_files(path: str = "."):
    root_dir = get_root_dir()
    target_dir = os.path.normpath(os.path.join(root_dir, path))

    if not target_dir.startswith(root_dir):
        return {"error": "Access denied"}

    if not os.path.isdir(target_dir):
        return {"error": "Not a directory"}

    # Define allowed directories at the root level
    allowed_root_items = ["booksim", "logs", "docs", "configs"]

    # Define patterns to ignore
    ignored_extensions = {'.d', '.o', '.a', '.docx', '.swp', '.gitignore'}
    ignored_files = {'lex.yy.c', 'y.tab.c', 'y.tab.h'}
    ignored_dirs = {'work'}

    files = []
    try:
        items = sorted(os.listdir(target_dir))
        dir_list = []
        file_list = []

        # Calculate depth relative to root_dir
        rel_target_path = os.path.relpath(target_dir, root_dir)

        for name in items:
            # If we are at the root, enforce strict filtering
            if rel_target_path == "." and name not in allowed_root_items:
                continue

            # Exclude AGENTS.md globally
            if name == "AGENTS.md":
                continue

            # Exclude the sandboxed booksim copy in logs directories
            if (name == "booksim" or name == "configs") and rel_target_path.split(os.sep)[0] == "logs":
                continue

            # Filter compiled files and build artifacts
            if name in ignored_files or name in ignored_dirs:
                continue
            if any(name.endswith(ext) for ext in ignored_extensions):
                continue

            full_path = os.path.join(target_dir, name)
            is_dir = os.path.isdir(full_path)
            rel_path = os.path.relpath(full_path, root_dir)

            # Get modification timestamp
            try:
                mtime = os.path.getmtime(full_path)
                modified_at = datetime.fromtimestamp(mtime, tz=timezone.utc).isoformat()
            except OSError:
                modified_at = None

            item_data = {"name": name, "path": rel_path, "isDir": is_dir, "modifiedAt": modified_at}
            if is_dir: dir_list.append(item_data)
            else: file_list.append(item_data)
        files = dir_list + file_list
    except PermissionError:
        return {"error": "Permission denied"}
    return {"files": files}

@router.get("/file")
async def get_file(path: str):
    root_dir = get_root_dir()

    # If it's an absolute path, make it relative to root_dir first
    if os.path.isabs(path):
        # Ensure we are working with the correct root
        try:
            path = os.path.relpath(path, root_dir)
        except ValueError:
            # If path is not inside root_dir, it will raise ValueError
            return {"error": "Access denied: file outside root"}

    # Strip leading ../ segments — the agent sends paths like ../booksim/src/...
    # which are relative to a parent context; stripping gives us booksim/src/...
    # which resolves correctly under the Bookin project root.
    while path.startswith('../'):
        path = path[3:]

    # Clean leading ./
    if path.startswith('./'):
        path = path[2:]
    target_path = os.path.normpath(os.path.join(root_dir, path))
    logger.debug(f"Resolved target_path={target_path}")

    # Allowlist: only directories inside the Bookin project
    allowed_dirs = [
        os.path.normpath(os.path.join(root_dir, 'booksim')),
        os.path.normpath(os.path.join(root_dir, 'logs')),
        os.path.normpath(os.path.join(root_dir, 'docs')),
        os.path.normpath(os.path.join(root_dir, 'configs')),
    ]
    is_allowed = any(target_path.startswith(d + os.sep) or target_path == d for d in allowed_dirs)

    if not is_allowed:
        return {"error": f"Access denied: '{target_path}' is outside the Bookin project"}

    resolved_path = os.path.relpath(target_path, root_dir)

    # If it's a directory, check for README.md inside it
    if os.path.isdir(target_path):
        readme_path = os.path.join(target_path, "README.md")
        if os.path.isfile(readme_path):
            target_path = readme_path
            resolved_path = os.path.relpath(target_path, root_dir)
        else:
            return {"error": f"Not a file or README.md not found in directory: {target_path}"}
    elif not os.path.isfile(target_path):
        return {"error": f"Not a file: {target_path}"}

    try:
        content = await asyncio.to_thread(_read_file_text, target_path)
        return {"content": content, "path": resolved_path}
    except Exception as e:
        return {"error": str(e)}

@router.post("/update-file")
async def update_file(payload: dict = Body(...)):
    path = payload.get("path")
    content = payload.get("content")
    if not path or content is None:
        return {"error": "Missing path or content"}
        
    root_dir = get_root_dir()
    target_path = os.path.normpath(os.path.join(root_dir, path))

    if not target_path.startswith(root_dir):
        return {"error": "Access denied"}

    try:
        await asyncio.to_thread(_write_file_text, target_path, content)
        return {"success": True}
    except Exception as e:
        return {"error": str(e)}



@router.post("/delete-item")
async def delete_item(payload: dict = Body(...)):
    path = payload.get("path")
    if not path:
        return {"error": "Missing path"}

    root_dir = get_root_dir()
    while path.startswith('../'):
        path = path[3:]
    if path.startswith('./'):
        path = path[2:]

    target_path = os.path.normpath(os.path.join(root_dir, path))
    if not target_path.startswith(root_dir):
        return {"error": "Access denied"}

    # Prevent deleting root_dir or main allowed top-level directories directly
    if target_path == root_dir or target_path in [os.path.join(root_dir, d) for d in ["booksim", "logs", "docs", "configs"]]:
        return {"error": "Cannot delete root system directory"}

    if not os.path.exists(target_path):
        return {"error": "Item not found"}

    try:
        if os.path.isdir(target_path):
            shutil.rmtree(target_path)
        else:
            os.remove(target_path)
        return {"success": True}
    except Exception as e:
        return {"error": str(e)}

@router.post("/rename-item")
async def rename_item(payload: dict = Body(...)):
    old_path = payload.get("oldPath")
    new_name = payload.get("newName")
    if not old_path or not new_name:
        return {"error": "Missing oldPath or newName"}

    # Sanitize new_name to prevent directory traversal
    new_name = os.path.basename(new_name.strip())
    if not new_name:
        return {"error": "Invalid new name"}

    root_dir = get_root_dir()
    while old_path.startswith('../'):
        old_path = old_path[3:]
    if old_path.startswith('./'):
        old_path = old_path[2:]

    target_old_path = os.path.normpath(os.path.join(root_dir, old_path))
    if not target_old_path.startswith(root_dir):
        return {"error": "Access denied"}

    if not os.path.exists(target_old_path):
        return {"error": "Source item not found"}

    parent_dir = os.path.dirname(target_old_path)
    target_new_path = os.path.join(parent_dir, new_name)

    if not target_new_path.startswith(root_dir):
        return {"error": "Access denied"}

    if os.path.exists(target_new_path):
        return {"error": f"An item named '{new_name}' already exists"}

    try:
        os.rename(target_old_path, target_new_path)
        rel_new_path = os.path.relpath(target_new_path, root_dir)
        return {"success": True, "newPath": rel_new_path, "newName": new_name}
    except Exception as e:
        return {"error": str(e)}



