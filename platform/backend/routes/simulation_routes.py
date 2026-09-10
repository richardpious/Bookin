from fastapi import APIRouter, Body, Request
import os
import re
import shutil
import subprocess
import logging
from paths import get_project_root

logger = logging.getLogger("SimulationRoutes")
router = APIRouter()
@router.post("/run-simulation")
async def run_simulation(request: Request, payload: dict = Body(...)):
    config_path = payload.get("config_path")
    username = payload.get("username")
    session_name = payload.get("session_name", "manual")
    
    if not config_path or not username:
        return {"error": "Missing config_path or username"}
        
    root_dir = get_project_root()
    
    # 1. Resolve source config path safely
    source_path = os.path.normpath(os.path.join(root_dir, config_path))
    if not source_path.startswith(root_dir) or not os.path.isfile(source_path):
        return {"error": f"Invalid config file: {config_path}"}
        
    # 2. Determine base log directory
    base_log_dir = os.path.join(root_dir, "logs", username, session_name)
    os.makedirs(base_log_dir, exist_ok=True)
    
    # 3. Determine next available run folder
    max_run_num = 0
    try:
        entries = os.listdir(base_log_dir)
        for entry in entries:
            match = re.match(r'run_(\d+)', entry)
            if match:
                num = int(match.group(1))
                if num > max_run_num:
                    max_run_num = num
    except OSError:
        pass
        
    next_run_num = str(max_run_num + 1).zfill(2)
    run_folder_name = f"run_{next_run_num}"
    run_dir = os.path.join(base_log_dir, run_folder_name)
    os.makedirs(run_dir, exist_ok=True)
    
    # 4. Copy config file
    target_config_path = os.path.join(run_dir, "config.cfg")
    shutil.copy(source_path, target_config_path)
    
    # 5. Spawn subprocess
    booksim_binary = os.path.join(root_dir, "booksim", "src", "booksim")
    log_file_path = os.path.join(run_dir, "simulation_output.log")
    
    try:
        # Run process asynchronously and redirect output
        # Use open without with so the file stays open for the subprocess
        log_file = open(log_file_path, "w")
        process = subprocess.Popen(
            [booksim_binary, "config.cfg"],
            cwd=run_dir,
            stdout=log_file,
            stderr=subprocess.STDOUT
        )
        
        # Store process handle for cleanup
        rel_run_dir = os.path.relpath(run_dir, root_dir)
        request.app.state.active_simulations[rel_run_dir] = {
            "process": process,
            "log_file": log_file
        }
        
        return {"success": True, "run_directory": rel_run_dir}
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

