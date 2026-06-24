from fastapi import APIRouter, Request, Body
import os
import re

router = APIRouter()

@router.get("/files")
async def list_files(path: str = "."):
    root_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..', '..'))
    target_dir = os.path.normpath(os.path.join(root_dir, path))

    if not target_dir.startswith(root_dir):
        return {"error": "Access denied"}

    if not os.path.isdir(target_dir):
        return {"error": "Not a directory"}

    # Define allowed directories at the root level
    allowed_root_items = ["booksim", "logs"]

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

@router.post("/update-file")
async def update_file(payload: dict = Body(...)):
    path = payload.get("path")
    content = payload.get("content")
    if not path or content is None:
        return {"error": "Missing path or content"}
        
    root_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..', '..'))
    target_path = os.path.normpath(os.path.join(root_dir, path))

    if not target_path.startswith(root_dir):
        return {"error": "Access denied"}

    try:
        with open(target_path, 'w', encoding='utf-8') as f:
            f.write(content)
        return {"success": True}
    except Exception as e:
        return {"error": str(e)}

@router.get("/config-parameters")
async def get_config_parameters():
    root_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..', '..'))
    config_path = os.path.join(root_dir, 'booksim', 'src', 'booksim_config.cpp')
    
    if not os.path.isfile(config_path):
        return {"error": "booksim_config.cpp not found"}
        
    try:
        with open(config_path, 'r', encoding='utf-8') as f:
            content = f.read()
            
        parameters = []
        
        # Parse AddStrField
        str_matches = re.finditer(r'AddStrField\s*\(\s*"([^"]+)"\s*,\s*"([^"]*)"\s*\)', content)
        for match in str_matches:
            parameters.append({
                "name": match.group(1),
                "defaultValue": match.group(2),
                "type": "string"
            })
            
        # Parse _int_map
        int_matches = re.finditer(r'_int_map\s*\[\s*"([^"]+)"\s*\]\s*=\s*([^;]+);', content)
        for match in int_matches:
            parameters.append({
                "name": match.group(1),
                "defaultValue": match.group(2).strip(),
                "type": "integer"
            })
            
        # Parse _float_map
        float_matches = re.finditer(r'_float_map\s*\[\s*"([^"]+)"\s*\]\s*=\s*([^;]+);', content)
        for match in float_matches:
            parameters.append({
                "name": match.group(1),
                "defaultValue": match.group(2).strip(),
                "type": "float"
            })
            
        # Merge duplicates
        merged_params = {}
        for p in parameters:
            name = p["name"]
            if name in merged_params:
                existing = merged_params[name]
                if p["type"] not in existing["type"]:
                    existing["type"] = f"{existing['type']} | {p['type']}"
                if existing["defaultValue"] == "" and p["defaultValue"] != "":
                    existing["defaultValue"] = p["defaultValue"]
                elif existing["defaultValue"] == '""' and p["defaultValue"] != '""':
                    existing["defaultValue"] = p["defaultValue"]
            else:
                merged_params[name] = p
                
        final_parameters = list(merged_params.values())
        final_parameters.sort(key=lambda x: x['name'])
            
        return {"parameters": final_parameters}
    except Exception as e:
        return {"error": str(e)}

