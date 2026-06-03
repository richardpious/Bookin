[<- Topology Index](README.md)

# Concentrated Mesh (CMesh) Topology

The Concentrated Mesh (`cmesh`) topology clusters multiple terminal nodes onto a single shared router, reducing the total number of switches while maintaining grid-like connectivity. It is implemented in the [CMesh](../../booksim/src/networks/cmesh.cpp) class.

---

## 1. Configuration & Parameters

-   **`k` (`_k`)**: Grid width (number of routers along one dimension).
-   **`n` (`_n`)**: Number of dimensions (restricted to $\le 2$).
-   **`c` (`_c`)**: Concentration factor (number of nodes per router, must be 4).
-   **`xrouter`, `yrouter`**: Node layout coordinates (must satisfy `xrouter * yrouter = c`).

### 1.1 Size Calculations
-   **Total Routers**: `powi(_k, _n)`
-   **Total Nodes**: `_c * powi(_k, _n)`
-   **Concentration Layout**: The `c` nodes are distributed into X and Y concentration grids based on the total dimensions.

---

## 2. Network Construction (`_BuildNet`)

The `_BuildNet` function constructs the concentrated mesh by iterating through the grid, placing routers, and wiring the concentrated terminals and express inter-router channels.

### 2.1 Router Allocation
The function loops through all computed router positions (`0` to `_size - 1`). Each router is instantiated with an input and output degree of `2 * _n + _c`. This accommodates the `c` terminal nodes and the `2 * n` grid neighbors.

### 2.2 Terminal Concentration Wiring
For each router, a nested loop maps the `c` local terminal nodes to the router's ports `0` through `c-1`. Injection and ejection channels are added for each of these nodes with a default latency of 1 cycle. The coordinates of the terminal nodes are calculated using local concentration offsets (`x` and `y` from `0` to `_cX-1` and `_cY-1`).

### 2.3 Express Channel Inter-router Wiring
The inter-router channels are mapped systematically for the $+X, -X, +Y, -Y$ directions. 
Crucially, edge routers use express channels to bypass intermediate hops:
- If a router is on an edge (e.g., `x == 0` or `x == _k - 1`), its outbound links loop across the mesh, skipping intermediate routers and directly connecting to routers `k/2` steps away.
- Standard inner-mesh links connect to adjacent neighbors.
Latencies for these links are dynamically set: if `use_noc_latency` is true, the physical wire delay is calculated based on coordinate distance; otherwise, it defaults to 1 cycle.
