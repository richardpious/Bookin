from fastapi import APIRouter, Request, Body
import os
import re
import shutil
import asyncio
from datetime import datetime, timezone

router = APIRouter()


def _read_file_text(target_path: str) -> str:
    with open(target_path, 'r', encoding='utf-8') as f:
        return f.read()

def _write_file_text(target_path: str, content: str):
    with open(target_path, 'w', encoding='utf-8') as f:
        f.write(content)


def get_root_dir():
    # Adjusted to point to the correct root dir:
    # Current: platform/backend/routes/file_routes.py
    # Root: platform/../..
    return os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..', '..'))

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
    print(f"DEBUG: Resolved target_path={target_path}")

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

@router.get("/config-parameters")
async def get_config_parameters():
    root_dir = get_root_dir()
    config_path = os.path.join(root_dir, 'booksim', 'src', 'booksim_config.cpp')
    
    # Parameters to exclude from the UI
    excluded_params = {
        "H_INVD2", "W_INVD2", "H_DFQD1", "W_DFQD1", "H_ND2D1", "W_ND2D1",
        "H_SRAM", "W_SRAM", "Vdd", "R", "IoffSRAM", "IoffP", "IoffN",
        "Cg_pwr", "Cd_pwr", "Cgdl", "Cg", "Cd", "LAMBDA", "MetalPitch",
        "Rw", "Cw_gnd", "Cw_cpl", "wire_length"
    }

    if not os.path.isfile(config_path):
        return {"error": "booksim_config.cpp not found"}
        
    try:
        with open(config_path, 'r', encoding='utf-8') as f:
            content = f.read()
            
        parameters = []
        
        # Parse AddStrField
        str_matches = re.finditer(r'AddStrField\s*\(\s*"([^"]+)"\s*,\s*"([^"]*)"\s*\)', content)
        for match in str_matches:
            if match.group(1) not in excluded_params:
                parameters.append({
                    "name": match.group(1),
                    "defaultValue": match.group(2),
                    "type": "string"
                })
            
        # Parse _int_map
        int_matches = re.finditer(r'_int_map\s*\[\s*"([^"]+)"\s*\]\s*=\s*([^;]+);', content)
        for match in int_matches:
            if match.group(1) not in excluded_params:
                parameters.append({
                    "name": match.group(1),
                    "defaultValue": match.group(2).strip(),
                    "type": "integer"
                })
                
        # Parse _float_map
        float_matches = re.finditer(r'_float_map\s*\[\s*"([^"]+)"\s*\]\s*=\s*([^;]+);', content)
        for match in float_matches:
            if match.group(1) not in excluded_params:
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

@router.get("/run-stats")
async def get_run_stats(path: str):
    root_dir = get_root_dir()
    
    # Normalize and resolve path safely
    while path.startswith('../'):
        path = path[3:]
    if path.startswith('./'):
        path = path[2:]
        
    target_path = os.path.normpath(os.path.join(root_dir, path))
    if not target_path.startswith(root_dir):
        return {"error": "Access denied"}
        
    if not os.path.isdir(target_path):
        # If passed a file directly, get its parent directory
        if os.path.isfile(target_path):
            target_path = os.path.dirname(target_path)
        else:
            return {"error": "Directory not found"}
            
    try:
        items = os.listdir(target_path)
        log_files = [f for f in items if f.endswith('.log')]
        
        if not log_files:
            return {"stats": None, "message": "No .log file found in run directory"}
            
        # Prefer simulation_output.log
        selected_log = "simulation_output.log" if "simulation_output.log" in log_files else log_files[0]
        log_path = os.path.join(target_path, selected_log)
        
        file_size = os.path.getsize(log_path)
        header_text = ""
        tail_text = ""
        
        with open(log_path, 'r', encoding='utf-8', errors='ignore') as f:
            # Read first 8KB for header configs
            header_text = f.read(8192)
            
            # Seek tail for end statistics
            if file_size > 131072:
                f.seek(file_size - 131072)
            else:
                f.seek(0)
            tail_text = f.read()
            
        full_text = header_text + "\n" + tail_text
        stats = {}
        
        # Generic parser for stats that follow the pattern:
        #   Stat name average = <val> (N samples)
        #           minimum = <val> (N samples)
        #           maximum = <val> (N samples)
        def parse_stat_block(label, key_prefix):
            pattern = (
                re.escape(label) + r' average = ([\d\.]+).*?\n'
                r'\s+minimum = ([\d\.]+).*?\n'
                r'\s+maximum = ([\d\.]+)'
            )
            m = re.search(pattern, tail_text)
            if m:
                stats[key_prefix + 'Avg'] = float(m.group(1))
                stats[key_prefix + 'Min'] = float(m.group(2))
                stats[key_prefix + 'Max'] = float(m.group(3))
        
        # Parse all stat blocks with avg/min/max
        parse_stat_block('Packet latency', 'packetLatency')
        parse_stat_block('Network latency', 'networkLatency')
        parse_stat_block('Flit latency', 'flitLatency')
        parse_stat_block('Fragmentation', 'fragmentation')
        parse_stat_block('Injected packet rate', 'injectedPacketRate')
        parse_stat_block('Accepted packet rate', 'acceptedPacketRate')
        parse_stat_block('Injected flit rate', 'injectedFlitRate')
        parse_stat_block('Accepted flit rate', 'acceptedFlitRate')
        
        # Parse simple single-value stats
        def parse_simple(pattern, key, cast=float):
            m = re.search(pattern, tail_text)
            if m:
                stats[key] = cast(m.group(1))
        
        parse_simple(r'Time taken is (\d+) cycles', 'cycles', int)
        parse_simple(r'Hops average = ([\d\.]+)', 'hopsAvg')
        parse_simple(r'Injected packet size average = ([\d\.]+)', 'injectedPacketSizeAvg')
        parse_simple(r'Accepted packet size average = ([\d\.]+)', 'acceptedPacketSizeAvg')
        parse_simple(r'Buffer busy stall rate = ([\d\.]+)', 'bufferBusyStallRate')
        parse_simple(r'Buffer conflict stall rate = ([\d\.]+)', 'bufferConflictStallRate')
        parse_simple(r'Buffer full stall rate = ([\d\.]+)', 'bufferFullStallRate')
        parse_simple(r'Buffer reserved stall rate = ([\d\.]+)', 'bufferReservedStallRate')
        parse_simple(r'Crossbar conflict stall rate = ([\d\.]+)', 'crossbarConflictStallRate')
        parse_simple(r'Total run time ([\d\.]+)', 'totalRunTime')
            
        # Parse header config parameters if present
        top_match = re.search(r'topology\s*=\s*([^;]+);', full_text)
        if top_match:
            stats['topology'] = top_match.group(1).strip()
            
        traffic_match = re.search(r'traffic\s*=\s*([^;]+);', full_text)
        if traffic_match:
            stats['traffic'] = traffic_match.group(1).strip()

        return {
            "stats": stats if stats else None,
            "logFile": selected_log
        }
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



