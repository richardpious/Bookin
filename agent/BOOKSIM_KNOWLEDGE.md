# BookSim Knowledge Encyclopedia

This is your built-in domain knowledge. Use this to answer user questions instantly without searching source code or making exploratory tool calls.

---

## 1. Topologies

### Mesh (`topology = mesh`)
- **Structure**: A 2D (or N-D) grid where each router connects to its immediate neighbors (up, down, left, right). Edge routers have fewer connections.
- **Parameters**: `k` = nodes per dimension, `n` = number of dimensions. A 4×4 mesh: `k=4; n=2`.
- **Bisection Bandwidth**: Low — only `k` links cross the midpoint.
- **Routing**: DOR (`dim_order`) is the standard, deadlock-free choice.
- **When to use**: Simple studies, baseline comparisons, understanding basic NoC behavior.
- **Trade-offs**: Easy to implement in silicon (regular layout), but long worst-case paths (2×(k-1) hops in 2D). Poor bisection bandwidth limits throughput under adversarial traffic.

### Torus (`topology = torus`)
- **Structure**: Like a mesh, but with wrap-around links connecting opposite edges. This halves the maximum distance.
- **Parameters**: Same as mesh: `k`, `n`.
- **Bisection Bandwidth**: Better than mesh (2× for same k,n) because of wrap-around links.
- **Routing**: DOR works but requires at least 2 VCs per physical channel to avoid deadlock on the wrap-around links (dateline routing).
- **When to use**: When you want better latency and throughput than mesh with the same router count.
- **Trade-offs**: Wrap-around links are physically longer (harder to lay out in silicon), and routing is slightly more complex (needs extra VCs).

### Fat Tree (`topology = fat_tree`)
- **Structure**: A hierarchical tree where bandwidth increases toward the root. Full bisection bandwidth — every node pair gets the same throughput.
- **Parameters**: `k` = switch radix (ports per switch), `n` = number of tree levels.
- **Routing**: Use `dest_tag` routing. Packets go up the tree until they reach a common ancestor, then down to the destination.
- **When to use**: Bisection bandwidth studies, or when you need a topology that doesn't bottleneck under any traffic pattern.
- **Trade-offs**: Expensive in hardware (many switches at higher levels). Non-minimal paths are rare but the structure is inherently non-blocking.

### Dragonfly (`topology = dragonfly`)
- **Structure**: Groups of routers connected by dense local links. Groups are connected to each other by sparse global links. A high-radix, low-diameter topology.
- **Parameters**: `k` = routers per group, `n` = number of groups (or other dragonfly-specific params).
- **Routing**: **Valiant routing is strongly recommended** (or required). DOR will cause severe congestion on global links because traffic is not evenly distributed.
- **When to use**: Studying modern datacenter/HPC interconnect designs.
- **Trade-offs**: Excellent throughput with Valiant, but Valiant doubles the average path length. Minimal routing (without randomization) causes hotspots.

### Concentrated Mesh (`topology = cmesh`)
- **Structure**: Multiple end-nodes share a single router (concentration). Reduces total router count.
- **Parameters**: `c` = concentration factor (nodes per router), `xr`/`yr` = how concentration is arranged spatially, `k`, `n`, `x`, `y`.
- **Routing**: `dor_no_express` is the standard routing function for cmesh.
- **When to use**: Area-constrained designs where you want more nodes without more routers.

### FlatFly (`topology = flatfly`)
- **Structure**: A low-diameter, high-radix topology. Each router connects to many others directly.
- **When to use**: Studies of high-radix router designs.

### Anynet (`topology = anynet`)
- **Structure**: Arbitrary topology defined by a `network_file`.
- **Parameters**: `network_file = <path_to_file>`.
- **When to use**: Custom or irregular topologies that don't fit standard patterns.

---

## 2. Routing Algorithms

| Algorithm | Type | Minimal? | Deadlock-Free? | Best For |
|-----------|------|----------|----------------|----------|
| `dim_order` / `dor` | Deterministic | Yes | Yes (mesh); needs ≥2 VCs (torus) | Mesh/Torus with uniform traffic |
| `xy` | Deterministic | Yes | Yes (mesh) | 2D mesh only |
| `yx` | Deterministic | Yes | Yes (mesh) | 2D mesh only (alternate dimension order) |
| `valiant` | Randomized | No (2× path) | Yes (with VCs) | Dragonfly; load-balancing adversarial traffic |
| `min_adapt` | Adaptive | Yes | Yes (with sufficient VCs) | Mesh/Torus under non-uniform traffic |
| `romm` | Randomized | Yes (multi-phase) | Yes | Mesh under moderate non-uniform traffic |
| `dest_tag` | Deterministic | Yes | Yes | Fat trees |
| `planar_adapt` | Adaptive | Yes | Yes | 2D mesh/torus |

### Key Rules:
- **Mesh**: Use `dim_order` (DOR). It's simple, minimal, and deadlock-free.
- **Torus**: Use `dim_order` but ensure `num_vcs >= 2` to handle the wrap-around dateline.
- **Fat Tree**: Use `dest_tag`.
- **Dragonfly**: Use `valiant`. Do NOT use `dim_order` — it will cause severe hotspotting.
- **Adaptive routing** (`min_adapt`): Needs more VCs than DOR (typically ≥4) to avoid deadlock.

---

## 3. Traffic Patterns

| Pattern | What It Does | What It Stresses |
|---------|-------------|------------------|
| `uniform` | Each node sends to any other with equal probability | Baseline — tests overall network capacity evenly |
| `bitcomp` | Node `i` sends to node `(~i) mod N` (bitwise complement) | Bisection bandwidth — traffic crosses the network center |
| `bitrev` | Node `i` sends to bit-reversed address of `i` | Similar to bitcomp but different crossing pattern |
| `transpose` | Node `(x,y)` sends to `(y,x)` | Diagonal stress on mesh — long paths for corner nodes |
| `shuffle` | Bit-shift permutation of destination address | Network symmetry and link utilization |
| `tornado` | Node `i` sends to `(i + ⌊k/2⌋ - 1) mod k` per dimension | Maximum distance traffic in torus (worst case for torus) |
| `neighbor` | Each node sends to its immediate neighbor | Minimal hop traffic — tests zero-load latency |
| `hotspot` | Mostly uniform, but configurable fraction goes to specific nodes | Congestion control and fairness under localized load |
| `randperm` | Random fixed permutation (each node has one fixed destination) | Permutation routing capacity |

### Recommendations by Study Goal:
- **Baseline / general performance**: `uniform`
- **Bisection bandwidth study**: `bitcomp`
- **Worst-case mesh latency**: `transpose`
- **Worst-case torus latency**: `tornado`
- **Congestion / fairness**: `hotspot`
- **Minimal latency measurement**: `neighbor`

---

## 4. Router Architecture & Allocation

### Router Types
- **`iq` (Input-Queued)**: The standard router. Uses Virtual Channels (VCs) at input ports. Pipeline: Route Computation → VC Allocation → Switch Allocation → Switch Traversal → Link Traversal.
- **`event`**: Event-driven router (less commonly used in standard studies).
- **`chaos`**: Chaos router — uses a shared buffer pool with random routing.

### Virtual Channels (VCs)
- **Purpose**: Prevent deadlock (break routing dependency cycles) and reduce head-of-line (HOL) blocking.
- **Key params**: `num_vcs` (VCs per port), `vc_buf_size` (buffer depth per VC in flits).
- **Rule of thumb**: DOR on mesh needs `num_vcs >= 1`. DOR on torus needs `num_vcs >= 2`. Adaptive routing needs `num_vcs >= 4`.

### VC Allocators
| Allocator | Description | Performance |
|-----------|-------------|-------------|
| `islip` | Iterative Separable LP — fair, widely used | Good general-purpose; standard choice |
| `pim` | Parallel Iterative Matching | Similar to iSLIP, slightly different fairness |
| `wavefront` | Wavefront allocation | Good for high-radix routers |
| `separable_input_first` | Separable: input arbitration first | Lower complexity |
| `separable_output_first` | Separable: output arbitration first | Lower complexity |

### Switch Allocators
Same options as VC allocators (`islip`, `pim`, `wavefront`, etc.). Controls which input-output pairs get crossbar access each cycle.

### Buffer Sizing Guidelines
- Larger `vc_buf_size` delays saturation (absorbs bursts) but costs area/power.
- More VCs (`num_vcs`) improves throughput by reducing HOL blocking, but each VC has its own buffer overhead.
- Typical starting point: `num_vcs = 4`, `vc_buf_size = 8`.

### Pipeline Delays
- `routing_delay`: Cycles for route computation (typically 0-1).
- `vc_alloc_delay`: Cycles for VC allocation (typically 1).
- `sw_alloc_delay`: Cycles for switch allocation (typically 1).
- `st_final_delay`: Cycles for switch + link traversal (typically 1).

### Speculative Allocation
- `speculative = 1`: Switch allocation happens in parallel with VC allocation (reduces pipeline by 1 cycle).
- Useful for latency reduction in low-load scenarios.

---

## 5. Common Errors & Debugging

| Symptom | Likely Cause | Fix |
|---------|-------------|-----|
| `Unknown topology "X"` | Misspelled topology name | Check against valid options: `torus`, `mesh`, `fat_tree`, `dragonfly`, `cmesh`, `flatfly`, `anynet` |
| `No route from X to Y` | Routing algorithm incompatible with topology | Use compatible routing (e.g., `dest_tag` for fat_tree, `dim_order` for mesh) |
| Simulation hangs / never converges | Injection rate above saturation point | Reduce `injection_rate`. Try 0.05 or lower. Also check `latency_thres`. |
| Simulation deadlocks (stalls completely) | Insufficient VCs for the routing algorithm | Increase `num_vcs`. Torus+DOR needs ≥2. Adaptive routing needs ≥4. |
| Segfault on startup | Topology parameter mismatch (`k`, `n`, `c`) | Verify parameters match the topology. E.g., cmesh needs `c`, `xr`, `yr`. |
| `Error: missing parameter` | Required parameter not set in config | Check `data/paramDependencies.json` for which params are required by your config. |
| Very high latency but no deadlock | Network is near saturation | Reduce `injection_rate` slightly below the saturation point. |
| Zero accepted rate | Traffic pattern or routing broken | Verify `traffic` param is valid. Check routing compatibility. |

---

## 6. Performance Interpretation Guide

### Key Metrics
- **Packet Latency Average**: Time (in cycles) from packet generation at source to delivery at destination. Includes serialization, queuing, and network traversal. Lower is better.
- **Network Latency Average**: Time spent inside the network only (excludes source queue waiting). Difference from packet latency = queuing delay at source.
- **Flit Latency Average**: Per-flit latency (a packet may be multiple flits).
- **Injected Packet Rate**: How many packets per node per cycle the source is generating.
- **Accepted Packet Rate**: How many packets per node per cycle the destination is receiving. At steady state, this should equal injected rate (if below saturation).
- **Injected Flit Rate**: Same as above but measured in flits.

### Understanding Saturation
- As `injection_rate` increases, latency stays roughly constant (= base network latency) until the **saturation point**.
- At saturation, queues fill up, latency spikes asymptotically toward infinity, and accepted rate plateaus.
- The saturation throughput is the maximum sustainable injection rate.
- If `accepted rate < injected rate`, the network is dropping/stalling packets — you're past saturation.

### Stall Rates
- **Buffer busy**: Input buffer was full when a flit arrived → increase `vc_buf_size`.
- **Buffer conflict**: Two flits contend for the same buffer → increase `num_vcs`.
- **Crossbar conflict**: Two flits contend for the same output port → try a better switch allocator.

### What's "Good"?
- **Latency < 2× base hop latency** at your target injection rate → healthy.
- **Accepted rate ≈ injected rate** → network is not saturated.
- **Stall rates < 5%** → no significant bottlenecks.
- **Throughput > 80% of theoretical bisection bandwidth** → efficient topology/routing choice.
