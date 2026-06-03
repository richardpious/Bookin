[<- Topology Index](README.md)

# Fat-Tree Topology

The Fat-Tree is a hierarchical multi-stage indirect network that provides high bisection bandwidth. It is implemented in the [FatTree](../../booksim/src/networks/fattree.cpp) class.

---

## 1. Parameters & Tree Sizing

-   **`k` (`_k`)**: Radix (number of descending child links per router).
-   **`n` (`_n`)**: Level count (tree height).

### 1.1 Sizing Formulas
-   **Total Terminals (`_nodes`)**: `powi(_k, _n)`
-   **Total Switches (`_size`)**: `_n * powi(_k, _n - 1)`
-   **Total Channels**: `(2 * _k * powi(_k, _n - 1)) * (_n - 1)`

---

## 2. Network Construction (`_BuildNet`)

The `_BuildNet` function creates the network by allocating routers level-by-level and establishing bidirectional connections up and down the tree.

### 2.1 Router Allocation by Level
The function loops over each level (`0` to `_n - 1`) and each position within the level. 
- The root switches (`level == 0`) are allocated with a degree of `_k` since they only have downward links.
- Middle and leaf switches are allocated with a degree of `2 * _k`, allowing `_k` links pointing down toward the leaves and `_k` links pointing up toward the root.

### 2.2 Leaf Stage (Terminal) Wiring
For the lowest level (`_n - 1`), the function loops over all router positions and their `_k` downward-facing ports. It connects injection and ejection channels from the terminal nodes to these ports, setting a latency of 1 cycle.

### 2.3 Inter-Stage Channel Rules
Ports are partitioned according to their physical routing direction:
-   **Output/Input ports `< k`**: Route DOWN the tree (toward leaves).
-   **Output/Input ports `>= k`**: Route UP the tree (toward roots).

### 2.4 Downward and Upward Channel Mapping
The function methodically registers output channels by looping over levels, positions, and ports. It calculates unique link IDs sequentially for downward and upward channels. 
To resolve the parent-child branches for input channels, a mathematical interleaving step is applied. The network branches are divided into "neighborhoods", and input ports are mapped using modular arithmetic (`neighborhood_pos % routers_per_branch * _k` and division offsets) to ensure proper fat-tree connectivity between stages.
