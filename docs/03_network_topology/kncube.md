[<- Topology Index](README.md)

# Mesh / Torus Topology (KNCube)

Standard regular $N$-dimensional grid topologies (Mesh and Torus) are implemented in the [KNCube](../../booksim/src/networks/kncube.cpp) class.

---

## 1. Parameters & Sizing Configuration

-   **`k` (`_k`)**: Radix (number of routers along each dimension).
-   **`n` (`_n`)**: Dimension count.

### Network Size Metrics
-   **Total Routers (`_size`)**: `powi(_k, _n)`
-   **Total Terminals (`_nodes`)**: `_size`
-   **Total Channels**: `2 * _n * _size`

---

## 2. Network Construction (`_BuildNet`)

The `_BuildNet` function creates the grid network by instantiating routers at each coordinate and systematically wiring neighboring routers along each dimension.

### 2.1 Router Allocation
The function loops over all nodes in the grid (`0` to `_size - 1`). Each router is allocated as a standard input-queued switch with a uniform degree of `2 * _n + 1`. This degree accommodates two grid ports (left/right or positive/negative) per dimension, plus one port dedicated to local injection/ejection.
Switch names are resolved via division and modulo operations to determine their $N$-dimensional coordinate representation (e.g., `router_x_y`).

### 2.2 Inter-Router Channels & Latency
For every router, the function iterates through each dimension `dim` (from `0` to `_n - 1`). 
-   **Neighbor Lookups**: It calculates the left and right neighbor IDs along the current dimension using the `_LeftNode` and `_RightNode` helper functions, which handle the edge conditions and wrap-around logic.
-   **Channel Mapping**: It identifies specific channel indices using `_LeftChannel` and `_RightChannel` helper functions. The router connects its output ports to the respective left and right channels, and binds its input ports to channels originating from the neighboring routers.
-   **Wire Delay**: If `use_noc_latency` is true, the physical wire delay is modeled. For Torus topologies, wrap-around links are assigned **2 cycles** latency to account for longer wire distance, while standard mesh links are assigned **1 cycle** latency. If not modeled, all links default to 1 cycle.

### 2.3 Terminal Connections
After wiring the grid ports, the last available port (index `2 * _n`) on each switch is mapped to the local injection and ejection channels for the terminal nodes, setting a latency of 1 cycle.
