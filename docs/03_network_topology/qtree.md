[<- Network Topology Index](README.md)

# Quad Tree (QTree) Topology

The Quad Tree is a hierarchical indirect network featuring 4 descending links per parent router. It is implemented in the [QTree](../../booksim/src/networks/qtree.cpp) class.

---

## 1. Parameter Constraints & Sizing

-   **`k` (`_k`)**: Radix (fixed at `4`).
-   **`n` (`_n`)**: Height (fixed at `3`).

> [!WARNING]
> QTree enforces a hardcoded assertion requiring `_k == 4 && _n == 3`.

### 1.1 Structural Sizing Formulas
-   **Total Terminals (`_nodes`)**: `powi(_k, _n) = 64`
-   **Total Switches (`_size`)**: Sum of `k^i` from `i=0` to `n-1` = `1 + 4 + 16 = 21`
-   **Total Channels**: `40`

---

## 2. Network Construction (`_BuildNet`)

The `_BuildNet` function builds the quad tree topology by instantiating routers across 3 levels (heights) and establishing parent-child hierarchical connections.

### 2.1 Switch Allocation by Layer
The function iterates over each height `h` (from `0` to `_n-1`), and for each height it iterates over the `k^h` positions.
-   **Root Switch (`h == 0`)**: The single root router is allocated with a degree of `_k = 4` because it only has downward links to its children.
-   **Child Switches (`h > 0`)**: Routers at lower levels are allocated with a degree of `_k + 1 = 5`, providing 4 downward links to children and 1 upward link to its parent.

### 2.2 Leaf Stage (Terminal) Wiring
A dedicated loop connects the terminal nodes. For the lowest level of switches (`_n - 1`), the function iterates through all positions and maps the `_k` downward ports to the injection and ejection channels of the terminal nodes. The latency is set to 1 cycle.

### 2.3 Parent-Child Inter-Stage Wires
To establish the hierarchy, the function iterates through the levels `h` and positions.
-   **Downward Child Channels**: For routers not at the leaf level (`h < _n-1`), the `_k` downward-facing output ports are connected to channels routing towards the children. Helper functions `_InputIndex` and `_OutputIndex` uniquely map these channels based on height, position, and port.
-   **Upward Parent Channels**: For routers not at the root level (`h > 0`), the upward-facing ports are connected to the parent switch. The function deduces the parent's index using integer division (`pos / _k`) and the respective port using modulo arithmetic (`pos % _k`), wiring the parent's output channel to the child's input, and the child's output to the parent's input.
