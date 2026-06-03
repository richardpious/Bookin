[<- Topology Index](README.md)

# Tree4 Topology

Tree4 is a specialized hierarchical network layout featuring 64 terminal nodes arranged in a tree topology with 4 routers at the root. It is implemented in the [Tree4](../../booksim/src/networks/tree4.cpp) class.

---

## 1. Sizing and Architecture

The topology structure is hardcoded for `k = 4` and `n = 3`:
-   **Level 0 (Root)**: 4 routers, sized 8x8 (8 descending links each)
-   **Level 1 (Middle)**: 8 routers, sized 8x8 (4 descending links, 4 ascending links)
-   **Level 2 (Leaves)**: 16 routers, sized 6x6 (4 descending links, 2 ascending links)
-   **Level 3**: 64 Terminal Nodes

### 1.1 Structural Sizing Formulas
-   **Total Terminals (`_nodes`)**: `64`
-   **Total Switches (`_size`)**: `4 + 8 + 16 = 28`
-   **Total Channels**: Calculated iteratively based on level sizes and router connectivities.

---

## 2. Network Construction (`_BuildNet`)

The `_BuildNet` function creates the specialized tree structure by allocating routers with varying degrees per level, and explicitly wiring channels between adjacent levels.

### 2.1 Switch Allocation by Level
The function loops over each level `h` (from `0` to `_n-1`). Based on the level, the total number of routers and their required degrees are computed:
-   **Roots and Middle (`h < _n - 1`)**: Switches are instantiated with a degree of 8 (supporting up to 8 inter-stage links).
-   **Leaves (`h == _n - 1`)**: Switches are instantiated with a degree of 6.
Router IDs are uniquely mapped by their level and horizontal position.

### 2.2 Terminal Node Connections
The function first addresses the lowest level (`_n-1`, i.e., Level 2). It iterates over the 16 leaf routers and binds their first 4 ports to the injection and ejection channels of the 64 terminal nodes, setting a latency of 1 cycle. 

### 2.3 Level 1 to Level 2 Channel Wiring
Next, the function explicitly maps channels between the Middle (h=1) and Leaf (h=2) routers. It iterates over the 8 Level 1 routers, and for each router, iterates over the `_k=4` descending ports. 
- The target Level 2 router position `pc` is calculated using `_k * ( pos / 2 ) + port`. 
- Output and Input channels are added bidirectionally between the parent (Level 1) and child (Level 2) routers with a latency of 1 cycle.

### 2.4 Level 0 to Level 1 Channel Wiring
Finally, the function maps channels between the Root (h=0) and Middle (h=1) routers. It loops over the 4 Level 0 root routers, and for each router, iterates over `2 * _k = 8` descending ports.
- The root router position `pp` maps to a specific middle router `pc` corresponding directly to the port index.
- Output and input channels are added bidirectionally between the root and middle routers, finalizing the tree topology connectivity.
