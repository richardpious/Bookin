"""
VCD (Value Change Dump) parser routes for the Network Topology Visualizer.

Provides two endpoints:
  GET /api/vcd/meta   — lightweight header parse + cycle index
  GET /api/vcd/cycles — paginated cycle-range event data
"""
import json
import gzip
from fastapi import APIRouter, Query, Response
import os
import re
import time
from typing import Dict, List, Optional, Tuple

router = APIRouter(prefix="/api/vcd", tags=["vcd"])

# ---------------------------------------------------------------------------
# In-memory cache: keyed by (abs_path, mtime) → parsed VCDIndex
# ---------------------------------------------------------------------------
_vcd_cache: Dict[str, "VCDIndex"] = {}


class VCDIndex:
    """
    Lightweight index built from a VCD file.
    Stores:
      - signal_map: short_id → signal_name
      - signal_name_to_id: signal_name → short_id
      - byte_offsets: list of (cycle_number, byte_offset) for each #<timestamp>
      - routers, nodes, ports, vcs counts (derived from signal names)
    """

    def _open_file(self, mode='rt'):
        if self.filepath.endswith('.gz'):
            return gzip.open(self.filepath, mode, encoding='ascii', errors='ignore')
        return open(self.filepath, mode, encoding='ascii', errors='ignore')

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
        with self._open_file('rt') as f:
            self._raw_content = f.read()

        offset = 0
        lines = self._raw_content.splitlines(True)
        
        # Phase 1: Parse header ($var lines)
        i = 0
        while i < len(lines):
            raw_line = lines[i]
            line_len = len(raw_line)
            line = raw_line.strip()
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
            i += 1

        # Derive topology info from signal names
        self._derive_topology()

        # Phase 2: Scan for all timestamp markers, count activity, and snapshot states
        cycle_changes = 0
        current_states = {}
        snapshot_interval = 500
        last_snapshot_idx = -1

        i += 1
        while i < len(lines):
            line_offset = offset
            raw_line = lines[i]
            offset += len(raw_line)
            line = raw_line.strip()
            
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
            i += 1

        # Save activity for last cycle
        if self.byte_offsets:
            self.activity.append(cycle_changes)

        if self.byte_offsets:
            self.start_cycle = self.byte_offsets[0][0]
            self.end_cycle = self.byte_offsets[-1][0]
            self.total_cycles = len(self.byte_offsets)

        # Optimization: pre-resolve signal short IDs to bypass string formats and lookups
        self._pre_resolve_signals()

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

    def _pre_resolve_signals(self):
        """Pre-resolve all short IDs for fast O(1) lookups during parsing."""
        # 1. Node gen signals
        self.node_gen_ids = []
        for node in range(self.nodes):
            prefix = f"node_{node}.gen"
            self.node_gen_ids.append({
                "valid": self.signal_name_to_id.get(f"{prefix}.valid"),
                "packet_id": self.signal_name_to_id.get(f"{prefix}.packet_id"),
                "src": self.signal_name_to_id.get(f"{prefix}.src"),
                "dest": self.signal_name_to_id.get(f"{prefix}.dest"),
                "flit_id_start": self.signal_name_to_id.get(f"{prefix}.flit_id_start"),
                "flit_id_end": self.signal_name_to_id.get(f"{prefix}.flit_id_end"),
            })

        # 2. Node injection links
        self.node_link_ids = []
        for node in range(self.nodes):
            prefix = f"node_{node}.link"
            self.node_link_ids.append({
                "valid": self.signal_name_to_id.get(f"{prefix}.valid"),
                "flit_id": self.signal_name_to_id.get(f"{prefix}.flit_id"),
                "packet_id": self.signal_name_to_id.get(f"{prefix}.packet_id"),
                "vc": self.signal_name_to_id.get(f"{prefix}.vc"),
                "src": self.signal_name_to_id.get(f"{prefix}.src"),
                "dest": self.signal_name_to_id.get(f"{prefix}.dest"),
                "head": self.signal_name_to_id.get(f"{prefix}.head"),
                "tail": self.signal_name_to_id.get(f"{prefix}.tail"),
            })

        # 3. Router inputs and links and occ
        self.router_ids = []
        for router in range(self.routers):
            ports_in = []
            ports_link = []
            ports_occ = []
            for port in range(self.ports):
                # in
                prefix_in = f"router_{router}.in_{port}"
                ports_in.append({
                    "valid": self.signal_name_to_id.get(f"{prefix_in}.valid"),
                    "flit_id": self.signal_name_to_id.get(f"{prefix_in}.flit_id"),
                    "packet_id": self.signal_name_to_id.get(f"{prefix_in}.packet_id"),
                    "vc": self.signal_name_to_id.get(f"{prefix_in}.vc"),
                    "src": self.signal_name_to_id.get(f"{prefix_in}.src"),
                    "dest": self.signal_name_to_id.get(f"{prefix_in}.dest"),
                    "head": self.signal_name_to_id.get(f"{prefix_in}.head"),
                    "tail": self.signal_name_to_id.get(f"{prefix_in}.tail"),
                })
                # link
                prefix_link = f"router_{router}.link_{port}"
                ports_link.append({
                    "valid": self.signal_name_to_id.get(f"{prefix_link}.valid"),
                    "flit_id": self.signal_name_to_id.get(f"{prefix_link}.flit_id"),
                    "packet_id": self.signal_name_to_id.get(f"{prefix_link}.packet_id"),
                    "vc": self.signal_name_to_id.get(f"{prefix_link}.vc"),
                    "src": self.signal_name_to_id.get(f"{prefix_link}.src"),
                    "dest": self.signal_name_to_id.get(f"{prefix_link}.dest"),
                    "head": self.signal_name_to_id.get(f"{prefix_link}.head"),
                    "tail": self.signal_name_to_id.get(f"{prefix_link}.tail"),
                })
                # occ
                vcs_occ = []
                for vc in range(self.vcs):
                    vcs_occ.append(self.signal_name_to_id.get(f"router_{router}.in_{port}.vc_{vc}.occupancy"))
                ports_occ.append(vcs_occ)

            self.router_ids.append({
                "in": ports_in,
                "link": ports_link,
                "occ": ports_occ
            })

        # 4. New granular signals
        self.router_vc_state_ids = []
        self.router_pipe_ids = []
        self.router_xbar_ids = []
        self.router_ds_ids = []
        self.node_inject_ids = []
        self.node_eject_ids = []
        
        for node in range(self.nodes):
            self.node_inject_ids.append({
                "valid": self.signal_name_to_id.get(f"node_{node}.inject.valid"),
                "flit": self.signal_name_to_id.get(f"node_{node}.inject.flit_id"),
                "pkt": self.signal_name_to_id.get(f"node_{node}.inject.packet_id"),
                "vc": self.signal_name_to_id.get(f"node_{node}.inject.vc"),
                "src": self.signal_name_to_id.get(f"node_{node}.inject.src"),
                "dest": self.signal_name_to_id.get(f"node_{node}.inject.dest"),
            })
            self.node_eject_ids.append({
                "valid": self.signal_name_to_id.get(f"node_{node}.eject.valid"),
                "flit": self.signal_name_to_id.get(f"node_{node}.eject.flit_id"),
                "pkt": self.signal_name_to_id.get(f"node_{node}.eject.packet_id"),
                "vc": self.signal_name_to_id.get(f"node_{node}.eject.vc"),
                "src": self.signal_name_to_id.get(f"node_{node}.eject.src"),
                "dest": self.signal_name_to_id.get(f"node_{node}.eject.dest"),
            })
            
        stages = ["BW", "RC", "VA", "SA", "ST"]
        for router in range(self.routers):
            ports_vc_state = []
            ports_pipe = []
            ports_xbar = []
            ports_ds = []
            
            for port in range(self.ports):
                # VC state (Component 1)
                vcs_state = []
                for vc in range(self.vcs):
                    prefix = f"router_{router}.in_{port}.vc_{vc}"
                    vcs_state.append({
                        "state": self.signal_name_to_id.get(f"{prefix}.state"),
                        "front_flit": self.signal_name_to_id.get(f"{prefix}.front_flit"),
                        "front_pkt": self.signal_name_to_id.get(f"{prefix}.front_pkt"),
                        "out_port": self.signal_name_to_id.get(f"{prefix}.out_port"),
                        "out_vc": self.signal_name_to_id.get(f"{prefix}.out_vc"),
                    })
                ports_vc_state.append(vcs_state)
                
                # Pipeline (Component 2) - per stage per input
                stage_ids = []
                for st in stages:
                    prefix = f"router_{router}.pipe.{st}.in_{port}"
                    stage_ids.append({
                        "valid": self.signal_name_to_id.get(f"{prefix}.valid"),
                        "flit": self.signal_name_to_id.get(f"{prefix}.flit_id"),
                        "pkt": self.signal_name_to_id.get(f"{prefix}.packet_id"),
                        "vc": self.signal_name_to_id.get(f"{prefix}.vc"),
                        "output": self.signal_name_to_id.get(f"{prefix}.output"),
                        "out_vc": self.signal_name_to_id.get(f"{prefix}.out_vc"),
                        "result": self.signal_name_to_id.get(f"{prefix}.result"),
                    })
                ports_pipe.append(stage_ids)
                
                # Crossbar (Component 4) - per output
                prefix = f"router_{router}.xbar.out_{port}"
                ports_xbar.append({
                    "valid": self.signal_name_to_id.get(f"{prefix}.valid"),
                    "flit": self.signal_name_to_id.get(f"{prefix}.flit_id"),
                    "pkt": self.signal_name_to_id.get(f"{prefix}.packet_id"),
                    "input": self.signal_name_to_id.get(f"{prefix}.input"),
                    "output": self.signal_name_to_id.get(f"{prefix}.output"),
                    "vc": self.signal_name_to_id.get(f"{prefix}.vc"),
                })
                
                # Downstream credits (Component 5) - per output, per vc
                ds_vcs = []
                for vc in range(self.vcs):
                    prefix = f"router_{router}.ds.out_{port}.vc_{vc}"
                    ds_vcs.append({
                        "occ": self.signal_name_to_id.get(f"{prefix}.occupancy"),
                        "avail": self.signal_name_to_id.get(f"{prefix}.available"),
                    })
                ports_ds.append(ds_vcs)
                
            self.router_vc_state_ids.append(ports_vc_state)
            self.router_pipe_ids.append(ports_pipe)
            self.router_xbar_ids.append(ports_xbar)
            self.router_ds_ids.append(ports_ds)

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

        if file_end:
            raw = self._raw_content[file_start:file_end]
        else:
            raw = self._raw_content[file_start:]

        res = self._parse_raw_cycles(raw, start, end, snapshot_state)
        return res

    def _parse_raw_cycles(self, raw: str, target_start: int, target_end: int, initial_state: Dict[str, int]) -> Dict:
        """Parse raw VCD text into structured cycle data."""
        cycles = {}
        current_cycle = None
        # Track current signal states for this block
        signal_states: Dict[str, int] = initial_state

        for line in raw.splitlines():
            if not line:
                continue
            c = line[0]
            if c in ('0', '1'):
                signal_states[line[1:]] = int(c)
            elif c == 'b':
                space_idx = line.find(' ')
                if space_idx != -1:
                    bits = line[1:space_idx]
                    sid = line[space_idx+1:]
                    try:
                        signal_states[sid] = int(bits, 2) if bits != '0' else 0
                    except ValueError:
                        pass
            elif c == '#':
                # Flush previous cycle
                if current_cycle is not None and target_start <= current_cycle <= target_end:
                    cycles[current_cycle] = self._build_cycle_events(signal_states)
                current_cycle = int(line[1:])

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
            "gen": [],
            "vc_state": [],
            "pipeline": [],
            "xbar": [],
            "credits": [],
            "inject": [],
            "eject": []
        }

        # Helper to get signal value directly by short_id
        def val(sid: str) -> Optional[int]:
            if sid is None: return None
            return signal_states.get(sid)

        # Inject/Eject
        for node in range(self.nodes):
            i_ids = self.node_inject_ids[node]
            if val(i_ids["valid"]) == 1:
                events["inject"].append({
                    "node": node,
                    "flit": val(i_ids["flit"]) or 0,
                    "pkt": val(i_ids["pkt"]) or 0,
                    "vc": val(i_ids["vc"]) or 0,
                    "src": val(i_ids["src"]) or 0,
                    "dest": val(i_ids["dest"]) or 0,
                })
            e_ids = self.node_eject_ids[node]
            if val(e_ids["valid"]) == 1:
                events["eject"].append({
                    "node": node,
                    "flit": val(e_ids["flit"]) or 0,
                    "pkt": val(e_ids["pkt"]) or 0,
                    "vc": val(e_ids["vc"]) or 0,
                    "src": val(e_ids["src"]) or 0,
                    "dest": val(e_ids["dest"]) or 0,
                })

        # Node generation events
        for node in range(self.nodes):
            ids = self.node_gen_ids[node]
            if val(ids["valid"]) == 1:
                events["gen"].append({
                    "node": node,
                    "pkt": val(ids["packet_id"]) or 0,
                    "src": val(ids["src"]) or 0,
                    "dest": val(ids["dest"]) or 0,
                    "flit_start": val(ids["flit_id_start"]) or 0,
                    "flit_end": val(ids["flit_id_end"]) or 0,
                })

        # Node link events (injection links)
        for node in range(self.nodes):
            ids = self.node_link_ids[node]
            if val(ids["valid"]) == 1:
                events["links"].append({
                    "type": "inject",
                    "node": node,
                    "flit": val(ids["flit_id"]) or 0,
                    "pkt": val(ids["packet_id"]) or 0,
                    "vc": val(ids["vc"]) or 0,
                    "src": val(ids["src"]) or 0,
                    "dest": val(ids["dest"]) or 0,
                    "head": val(ids["head"]) == 1,
                    "tail": val(ids["tail"]) == 1,
                })

        # Router events
        for router in range(self.routers):
            r_ids = self.router_ids[router]
            for port in range(self.ports):
                # Router input events
                in_ids = r_ids["in"][port]
                if val(in_ids["valid"]) == 1:
                    events["router_in"].append({
                        "router": router,
                        "port": port,
                        "flit": val(in_ids["flit_id"]) or 0,
                        "pkt": val(in_ids["packet_id"]) or 0,
                        "vc": val(in_ids["vc"]) or 0,
                        "src": val(in_ids["src"]) or 0,
                        "dest": val(in_ids["dest"]) or 0,
                        "head": val(in_ids["head"]) == 1,
                        "tail": val(in_ids["tail"]) == 1,
                    })

                # Router link events (router-to-router)
                link_ids = r_ids["link"][port]
                if val(link_ids["valid"]) == 1:
                    dest_router = self._mesh_neighbor(router, port)
                    events["links"].append({
                        "type": "router",
                        "from": router,
                        "to": dest_router,
                        "port": port,
                        "flit": val(link_ids["flit_id"]) or 0,
                        "pkt": val(link_ids["packet_id"]) or 0,
                        "vc": val(link_ids["vc"]) or 0,
                        "src": val(link_ids["src"]) or 0,
                        "dest": val(link_ids["dest"]) or 0,
                        "head": val(link_ids["head"]) == 1,
                        "tail": val(link_ids["tail"]) == 1,
                    })

                # VC occupancy
                occ_ids = r_ids["occ"][port]
                for vc in range(self.vcs):
                    occ_val = val(occ_ids[vc])
                    if occ_val is not None and occ_val > 0:
                        events["vc_occ"].append({
                            "router": router,
                            "port": port,
                            "vc": vc,
                            "occ": occ_val,
                        })
                        
                # VC state
                for vc in range(self.vcs):
                    st = self.router_vc_state_ids[router][port][vc]
                    st_val = val(st["state"])
                    if st_val is not None:
                        events["vc_state"].append({
                            "router": router, "port": port, "vc": vc,
                            "state": st_val,
                            "flit": val(st["front_flit"]),
                            "pkt": val(st["front_pkt"]),
                            "out_port": val(st["out_port"]),
                            "out_vc": val(st["out_vc"])
                        })
                        
                # Pipeline
                stages = ["BW", "RC", "VA", "SA", "ST"]
                for i, stage_name in enumerate(stages):
                    p_ids = self.router_pipe_ids[router][port][i]
                    if val(p_ids["valid"]) == 1:
                        events["pipeline"].append({
                            "router": router, "input": port, "stage": stage_name,
                            "flit": val(p_ids["flit"]) or 0,
                            "pkt": val(p_ids["pkt"]) or 0,
                            "vc": val(p_ids["vc"]) or 0,
                            "output": val(p_ids["output"]),
                            "out_vc": val(p_ids["out_vc"]),
                            "result": val(p_ids["result"])
                        })
                        
                # Crossbar
                x_ids = self.router_xbar_ids[router][port]
                if val(x_ids["valid"]) == 1:
                    events["xbar"].append({
                        "router": router, "output": port,
                        "flit": val(x_ids["flit"]) or 0,
                        "pkt": val(x_ids["pkt"]) or 0,
                        "input": val(x_ids["input"]) or 0,
                        "vc": val(x_ids["vc"]) or 0
                    })
                    
                # Downstream credits
                for vc in range(self.vcs):
                    ds_ids = self.router_ds_ids[router][port][vc]
                    occ = val(ds_ids["occ"])
                    avail = val(ds_ids["avail"])
                    if occ is not None or avail is not None:
                        events["credits"].append({
                            "router": router, "output": port, "vc": vc,
                            "occ": occ, "avail": avail
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
    if abs_path in _vcd_cache:
        return _vcd_cache[abs_path]

    _vcd_cache.clear()
    index = VCDIndex(abs_path)
    _vcd_cache[abs_path] = index
    return index

@router.delete("/cache")
def vcd_cache_evict(path: str = Query(...)):
    abs_path = _resolve_path(path)
    if abs_path and abs_path in _vcd_cache:
        del _vcd_cache[abs_path]
    return {"ok": True}


@router.get("/meta")
def vcd_meta(path: str = Query(..., description="Relative path to .vcd file")):
    """
    Parse VCD header and return lightweight metadata + activity map.
    Response ~1-5 KB regardless of file size.
    """
    abs_path = _resolve_path(path)
    if not abs_path:
        return {"error": f"File not found or access denied: {path}"}

    if not abs_path.endswith('.vcd') and not abs_path.endswith('.vcd.gz'):
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
async def vcd_cycles(
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

        res_data = {
            "range": [start, end],
            "cycles": cycles,
            "cycleCount": len(cycles),
            "readTimeMs": round(read_time * 1000, 1),
        }
        return Response(content=json.dumps(res_data), media_type="application/json")
    except Exception as e:
        return {"error": str(e)}
