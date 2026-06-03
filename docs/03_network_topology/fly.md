[<- Topology Index](README.md)

# Butterfly Stage (Fly) Topology

The Butterfly Stage (`fly`) is a classic multi-stage indirect network topology. It is implemented in the [KNFly](../../booksim/src/networks/fly.cpp) class.

---

## 1. Parameters

-   **`k` (`_k`)**: Radix (defining the uniform `k x k` switch crossbar size).
-   **`n` (`_n`)**: Dimension/stage count.

### 1.1 Sizing Formulas
-   **Total Terminals (`_nodes`)**: `powi(_k, _n)`
-   **Total Switches (`_size`)**: `_n * powi(_k, _n - 1)`
-   **Total Inter-stage Channels**: `(_n - 1) * _nodes`

---

## 2. Network Construction (`_BuildNet`)

The `_BuildNet` function creates the multi-stage network by instantiating switches stage-by-stage and wiring inter-stage butterfly patterns.

### 2.1 Switch Allocation by Stage
The function contains an outer loop over the network stages (`0` to `_n - 1`) and an inner loop over the address space within each stage (`0` to `k^(n-1) - 1`). Inside this nested loop, it instantiates each router with a uniform `k x k` radix.

### 2.2 Boundary Terminal Connections
While processing a router's `_k` ports:
-   **Injection Channels**: If the router belongs to the first stage (`stage == 0`), the input ports are directly wired to the processor injection channels.
-   **Ejection Channels**: If the router belongs to the final stage (`stage == _n - 1`), the output ports are directly wired to the processor ejection channels.

### 2.3 Inter-Stage Channels (Outgoings)
For routers not in the final stage, their output channels are mapped to inter-stage wires. The `_OutChannel` helper function computes the sequential outgoing link ID based on the stage, address, and port, which is then added to the router.

### 2.4 Digit-Swapping Input Channels (Incomings)
For routers not in the first stage, their input channels must be mapped to match the butterfly cross-connect pattern. The `_InChannel` helper function performs digit-swapping arithmetic on the coordinate addressing. It isolates the highest-order and lowest-order digits in the given stage dimension, swaps them, and reconstructs the source router address. This ensures that flits traverse across all required bit-dimensions over exactly `_n` stage traversals.
