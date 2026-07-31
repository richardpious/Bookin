"""
VCD (Value Change Dump) parser routes for the Network Topology Visualizer.

Provides two endpoints:
  GET /api/vcd/meta   — lightweight header parse + cycle index
  GET /api/vcd/cycles — paginated cycle-range event data
"""

from fastapi import APIRouter, Query
import os
import re
import time
from typing import Dict, List, Optional, Tuple

router = APIRouter(prefix="/api/vcd", tags=["vcd"])

# ---------------------------------------------------------------------------
# In-memory cache: keyed by (abs_path, mtime) → parsed VCDIndex
# ---------------------------------------------------------------------------
_vcd_cache: Dict[Tuple[str, float], "VCDIndex"] = {}
_CACHE_MAX = 8  # keep at most N parsed files


class VCDIndex:
    """
    Lightweight index built from a VCD file.
    Stores:
      - signal_map: short_id → signal_name
      - signal_name_to_id: signal_name → short_id
      - byte_offsets: list of (cycle_number, byte_offset) for each #<timestamp>
      - routers, nodes, ports, vcs counts (derived from signal names)
    """

    def __init__(self, filepath: str):
        self.filepath = filepath
        self.signal_map: Dict[str, str] = {}       # short_id → signal_name
        self.signal_name_to_id: Dict[str, str] = {}  # signal_name → short_id
        self.byte_offsets: List[Tuple[int, int]] = []  # (cycle, byte_offset)
        self.activity: List[int] = []              # signal changes per cycle
        self.header_end_offset: int = 0
        self.routers = 0
        self.nodes = 0
        self.ports = 0
        self.vcs = 0
        self.k = 0  # mesh dimension
        self.start_cycle = 0
        self.end_cycle = 0
        self.total_cycles = 0
        self.snapshots: List[Tuple[int, Dict[str, int]]] = [] # (cycle, signal_states)
        self._parse()

    def _parse(self):
        """Parse VCD header for signal definitions and scan for timestamp offsets."""
        with open(self.filepath, 'rb') as f:
            offset = 0
            # Phase 1: Parse header ($var lines)
            while True:
                raw_line = f.readline()
                if not raw_line:
                    break
                line_len = len(raw_line)
                line = raw_line.strip().decode('ascii', errors='ignore')
                if line.startswith('$enddefinitions'):
                    offset += line_len
                    self.header_end_offset = offset
                    break
                if line.startswith('$var'):
                    parts = line.split()
                    if len(parts) >= 5:
                        short_id = parts[3]
                        sig_name = parts[4]
                        self.signal_map[short_id] = sig_name
                        self.signal_name_to_id[sig_name] = short_id
                offset += line_len

            # Derive topology info from signal names
            self._derive_topology()

            # Phase 2: Scan for all timestamp markers, count activity, and snapshot states
            cycle_changes = 0
            current_states = {}
            snapshot_interval = 500
            last_snapshot_idx = -1

            while True:
                line_offset = offset
                raw_line = f.readline()
                if not raw_line:
                    break
                offset += len(raw_line)
                line = raw_line.strip().decode('ascii', errors='ignore')
                if line.startswith('#'):
                    # Save activity count for previous cycle
                    if self.byte_offsets:
                        self.activity.append(cycle_changes)
                    try:
                        cycle_num = int(line[1:])
                        self.byte_offsets.append((cycle_num, line_offset))
                        
                        # Snapshot logic
                        if len(self.byte_offsets) - 1 >= last_snapshot_idx + snapshot_interval:
                            self.snapshots.append((cycle_num, dict(current_states)))
                            last_snapshot_idx = len(self.byte_offsets) - 1
                    except ValueError:
                        pass
                    cycle_changes = 0
                elif line and not line.startswith('$'):
                    cycle_changes += 1
                    # Track state for snapshots
                    if line.startswith('b'):
                        parts = line.split(' ', 1)
                        if len(parts) == 2:
                            bits = parts[0][1:]
                            sid = parts[1]
                            try:
                                current_states[sid] = int(bits, 2) if bits != '0' else 0
                            except ValueError:
                                current_states[sid] = 0
                    elif line[0] in ('0', '1'):
                        try:
                            val = int(line[0])
                            sid = line[1:]
                            current_states[sid] = val
                        except ValueError:
                            pass

            # Save activity for last cycle
            if self.byte_offsets:
                self.activity.append(cycle_changes)

            if self.byte_offsets:
                self.start_cycle = self.byte_offsets[0][0]
                self.end_cycle = self.byte_offsets[-1][0]
                self.total_cycles = len(self.byte_offsets)

    def _derive_topology(self):
        """Derive router/node counts from signal names."""
        max_node = -1
        max_router = -1
        max_port = -1
        max_vc = -1

        for name in self.signal_name_to_id:
            # node_X.gen.valid
            m = re.match(r'node_(\d+)\.', name)
            if m:
                max_node = max(max_node, int(m.group(1)))

            # router_X.in_Y.valid or router_X.link_Y.valid
            m = re.match(r'router_(\d+)\.(in|link)_(\d+)\.', name)
            if m:
                max_router = max(max_router, int(m.group(1)))
                max_port = max(max_port, int(m.group(3)))

            # router_X.in_Y.vc_Z.occupancy
            m = re.match(r'router_(\d+)\.in_(\d+)\.vc_(\d+)\.', name)
            if m:
                max_vc = max(max_vc, int(m.group(3)))

        self.nodes = max_node + 1 if max_node >= 0 else 0
        self.routers = max_router + 1 if max_router >= 0 else 0
        self.ports = max_port + 1 if max_port >= 0 else 0
        self.vcs = max_vc + 1 if max_vc >= 0 else 0

        # Derive mesh dimension k (assumes k×k mesh where routers == k*k)
        if self.routers > 0:
            import math
            self.k = int(math.sqrt(self.routers))
            if self.k * self.k != self.routers:
                self.k = int(math.ceil(math.sqrt(self.routers)))

    def get_cycle_index(self, cycle: int) -> Optional[int]:
        """Binary search for the index of a cycle in byte_offsets."""
        lo, hi = 0, len(self.byte_offsets) - 1
        while lo <= hi:
            mid = (lo + hi) // 2
            if self.byte_offsets[mid][0] == cycle:
                return mid
            elif self.byte_offsets[mid][0] < cycle:
                lo = mid + 1
            else:
                hi = mid - 1
        return None

    def read_cycles(self, start: int, end: int) -> Dict:
        """
        Read VCD data for cycles in [start, end].
        Returns a dict: { cycle_number: { links: [...], router_in: [...], vc_occ: [...], gen: [...] } }
        """
        # Find index range
        start_idx = None
        end_idx = None
        for i, (cyc, _) in enumerate(self.byte_offsets):
            if cyc >= start and start_idx is None:
                start_idx = i
            if cyc <= end:
                end_idx = i
            if cyc > end:
                break

        if start_idx is None or end_idx is None:
            return {}

        # Find closest snapshot <= start
        snapshot_state = {}
        snapshot_cycle = -1
        # self.snapshots is sorted by cycle
        for cyc, state in reversed(self.snapshots):
            if cyc <= start:
                snapshot_state = dict(state)
                snapshot_cycle = cyc
                break

        if snapshot_cycle == -1:
            file_start = self.header_end_offset
            file_end = self.byte_offsets[end_idx + 1][1] if end_idx + 1 < len(self.byte_offsets) else None
        else:
            snapshot_idx = self.get_cycle_index(snapshot_cycle)
            file_start = self.byte_offsets[snapshot_idx][1] if snapshot_idx is not None else self.header_end_offset
            file_end = self.byte_offsets[end_idx + 1][1] if end_idx + 1 < len(self.byte_offsets) else None

        with open(self.filepath, 'r', encoding='utf-8', errors='ignore') as f:
            f.seek(file_start)
            if file_end:
                raw = f.read(file_end - file_start)
            else:
                raw = f.read()

        return self._parse_raw_cycles(raw, start, end, snapshot_state)

    def _parse_raw_cycles(self, raw: str, target_start: int, target_end: int, initial_state: Dict[str, int]) -> Dict:
        """Parse raw VCD text into structured cycle data."""
        cycles = {}
        current_cycle = None
        # Track current signal states for this block
        signal_states: Dict[str, int] = initial_state

        for line in raw.split('\n'):
            line = line.strip()
            if not line or line.startswith('$'):
                continue

            if line.startswith('#'):
                # Flush previous cycle
                if current_cycle is not None and target_start <= current_cycle <= target_end:
                    cycles[current_cycle] = self._build_cycle_events(signal_states)

                current_cycle = int(line[1:])
                continue

            # Parse value change
            if line.startswith('b'):
                # Binary value: b<bits> <id>
                parts = line.split(' ', 1)
                if len(parts) == 2:
                    bits = parts[0][1:]  # strip 'b'
                    sid = parts[1]
                    try:
                        signal_states[sid] = int(bits, 2) if bits != '0' else 0
                    except ValueError:
                        signal_states[sid] = 0
            elif line[0] in ('0', '1'):
                # Single-bit: 0<id> or 1<id>
                val = int(line[0])
                sid = line[1:]
                signal_states[sid] = val

        # Flush last cycle
        if current_cycle is not None and target_start <= current_cycle <= target_end:
            cycles[current_cycle] = self._build_cycle_events(signal_states)

        return cycles

    def _build_cycle_events(self, signal_states: Dict[str, int]) -> Dict:
        """Convert raw signal states into structured event lists."""
        events = {
            "links": [],
            "router_in": [],
            "vc_occ": [],
            "gen": []
        }

        # Helper to resolve signal value
        def val(sig_name: str) -> Optional[int]:
            sid = self.signal_name_to_id.get(sig_name)
            if sid is None:
                return None
            return signal_states.get(sid)

        # Node generation events
        for node in range(self.nodes):
            prefix = f"node_{node}.gen"
            if val(f"{prefix}.valid") == 1:
                events["gen"].append({
                    "node": node,
                    "pkt": val(f"{prefix}.packet_id") or 0,
                    "src": val(f"{prefix}.src") or 0,
                    "dest": val(f"{prefix}.dest") or 0,
                    "flit_start": val(f"{prefix}.flit_id_start") or 0,
                    "flit_end": val(f"{prefix}.flit_id_end") or 0,
                })

        # Node link events (injection links)
        for node in range(self.nodes):
            prefix = f"node_{node}.link"
            if val(f"{prefix}.valid") == 1:
                events["links"].append({
                    "type": "inject",
                    "node": node,
                    "flit": val(f"{prefix}.flit_id") or 0,
                    "pkt": val(f"{prefix}.packet_id") or 0,
                    "vc": val(f"{prefix}.vc") or 0,
                    "src": val(f"{prefix}.src") or 0,
                    "dest": val(f"{prefix}.dest") or 0,
                    "head": val(f"{prefix}.head") == 1,
                    "tail": val(f"{prefix}.tail") == 1,
                })

        # Router input events
        for router in range(self.routers):
            for port in range(self.ports):
                prefix = f"router_{router}.in_{port}"
                if val(f"{prefix}.valid") == 1:
                    events["router_in"].append({
                        "router": router,
                        "port": port,
                        "flit": val(f"{prefix}.flit_id") or 0,
                        "pkt": val(f"{prefix}.packet_id") or 0,
                        "vc": val(f"{prefix}.vc") or 0,
                        "src": val(f"{prefix}.src") or 0,
                        "dest": val(f"{prefix}.dest") or 0,
                        "head": val(f"{prefix}.head") == 1,
                        "tail": val(f"{prefix}.tail") == 1,
                    })

                # Router link events (router-to-router)
                link_prefix = f"router_{router}.link_{port}"
                if val(f"{link_prefix}.valid") == 1:
                    # Determine destination router based on mesh topology
                    dest_router = self._mesh_neighbor(router, port)
                    events["links"].append({
                        "type": "router",
                        "from": router,
                        "to": dest_router,
                        "port": port,
                        "flit": val(f"{link_prefix}.flit_id") or 0,
                        "pkt": val(f"{link_prefix}.packet_id") or 0,
                        "vc": val(f"{link_prefix}.vc") or 0,
                        "src": val(f"{link_prefix}.src") or 0,
                        "dest": val(f"{link_prefix}.dest") or 0,
                        "head": val(f"{link_prefix}.head") == 1,
                        "tail": val(f"{link_prefix}.tail") == 1,
                    })

                # VC occupancy
                for vc in range(self.vcs):
                    occ_name = f"router_{router}.in_{port}.vc_{vc}.occupancy"
                    occ_val = val(occ_name)
                    if occ_val is not None and occ_val > 0:
                        events["vc_occ"].append({
                            "router": router,
                            "port": port,
                            "vc": vc,
                            "occ": occ_val,
                        })

        return events

    def _mesh_neighbor(self, router: int, port: int) -> int:
        """
        Map (router, output_port) to the destination router in a k×k mesh.
        BookSim kncube.cpp _BuildNet wires output channels in this order:
          For each dimension (dim=0 is X, dim=1 is Y):
            AddOutputChannel(right) then AddOutputChannel(left)
          Then AddOutputChannel(eject)

        So for a 2D mesh (n=2):
          Port 0: Right in dim 0 → East  (+1 in x)
          Port 1: Left  in dim 0 → West  (-1 in x)
          Port 2: Right in dim 1 → South (+1 in y)
          Port 3: Left  in dim 1 → North (-1 in y)
          Port 4: Local (ejection)
        """
        if self.k == 0:
            return -1
        x = router % self.k
        y = router // self.k
        if port == 0:    # East (right in dim 0)
            nx, ny = x + 1, y
        elif port == 1:  # West (left in dim 0)
            nx, ny = x - 1, y
        elif port == 2:  # South (right in dim 1)
            nx, ny = x, y + 1
        elif port == 3:  # North (left in dim 1)
            nx, ny = x, y - 1
        elif port == 4:  # Local (ejection)
            return router  # same as self
        else:
            return -1

        if 0 <= nx < self.k and 0 <= ny < self.k:
            return ny * self.k + nx
        return -1  # out of bounds (edge of mesh)


def _get_root_dir():
    return os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..', '..'))


def _resolve_path(path: str) -> Optional[str]:
    """Resolve a relative path to an absolute path under the project root."""
    root = _get_root_dir()

    if os.path.isabs(path):
        abs_path = os.path.normpath(path)
    else:
        # Strip leading ../
        while path.startswith('../'):
            path = path[3:]
        if path.startswith('./'):
            path = path[2:]
        abs_path = os.path.normpath(os.path.join(root, path))

    # Security: must be under root
    if not abs_path.startswith(root):
        return None
    if not os.path.isfile(abs_path):
        return None
    return abs_path


def _get_index(abs_path: str) -> VCDIndex:
    """Get or create a cached VCDIndex for the given file."""
    mtime = os.path.getmtime(abs_path)
    key = (abs_path, mtime)

    if key in _vcd_cache:
        return _vcd_cache[key]

    # Evict old entries if cache is full
    while len(_vcd_cache) >= _CACHE_MAX:
        oldest_key = next(iter(_vcd_cache))
        del _vcd_cache[oldest_key]

    index = VCDIndex(abs_path)
    _vcd_cache[key] = index
    return index


@router.get("/meta")
def vcd_meta(path: str = Query(..., description="Relative path to .vcd file")):
    """
    Parse VCD header and return lightweight metadata + activity map.
    Response ~1-5 KB regardless of file size.
    """
    abs_path = _resolve_path(path)
    if not abs_path:
        return {"error": f"File not found or access denied: {path}"}

    if not abs_path.endswith('.vcd'):
        return {"error": "Not a VCD file"}

    try:
        t0 = time.time()
        index = _get_index(abs_path)
        parse_time = time.time() - t0

        return {
            "topology": {
                "routers": index.routers,
                "nodes": index.nodes,
                "ports": index.ports,
                "vcs": index.vcs,
                "k": index.k,
                "n": 2,  # mesh dimension (2D)
                "type": "mesh",
            },
            "timeline": {
                "startCycle": index.start_cycle,
                "endCycle": index.end_cycle,
                "totalCycles": index.total_cycles,
            },
            "activityMap": index.activity,
            "parseTimeMs": round(parse_time * 1000, 1),
        }
    except Exception as e:
        return {"error": str(e)}


@router.get("/cycles")
def vcd_cycles(
    path: str = Query(..., description="Relative path to .vcd file"),
    start: int = Query(0, description="Start cycle (inclusive)"),
    end: int = Query(100, description="End cycle (inclusive)"),
):
    """
    Return structured event data for cycles in [start, end].
    Capped at 500 cycles per request.
    """
    abs_path = _resolve_path(path)
    if not abs_path:
        return {"error": f"File not found or access denied: {path}"}

    # Cap range
    max_range = 500
    if end - start > max_range:
        end = start + max_range

    try:
        t0 = time.time()
        index = _get_index(abs_path)
        cycles = index.read_cycles(start, end)
        read_time = time.time() - t0

        return {
            "range": [start, end],
            "cycles": cycles,
            "cycleCount": len(cycles),
            "readTimeMs": round(read_time * 1000, 1),
        }
    except Exception as e:
        return {"error": str(e)}
