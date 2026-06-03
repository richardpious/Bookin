[<- Topology Index](README.md)

# Flattened Butterfly (FlatFly) Topology

The Flattened Butterfly (`flatfly`) is a high-radix on-chip direct topology that establishes fully-connected cliques of switches across multiple dimensions. It is implemented in the [FlatFlyOnChip](../../booksim/src/networks/flatfly_onchip.cpp) class.

---

## 1. Sizing Parameters

-   **`k` (`_k`)**: Switch dimension radix (switches along each dimension).
-   **`n` (`_n`)**: Number of dimensions (supports up to 4).
-   **`c` (`_c`)**: Concentration degree (terminal nodes per switch).

### 1.1 Structural Sizing
-   **Switch Radix (`_r`)**: `_c + (_k - 1) * _n`
-   **Total Terminals (`_nodes`)**: `powi(_k, _n) * _c`
-   **Total Switches**: `_nodes / _c`

---

## 2. Network Construction (`_BuildNet`)

The `_BuildNet` function builds the topology by instantiating routers and wiring fully connected sub-networks along each grid dimension.

### 2.1 Router Allocation
The function loops over all switches in the network (`0` to `_num_of_switch - 1`) and instantiates them with the calculated uniform radix `_r`.

### 2.2 Local Terminal Mapping & Delay Modeling
For each router, the function computes the injection and ejection channels for its `_c` concentrated terminal clients. If `use_noc_latency` is enabled, the function explicitly models the physical layout by computing the Manhattan distance (`ileng`) from the physical center of the router to the concentrated client coordinate on a 2D layout. This offset distance determines the injection and ejection latency.

### 2.3 Dimension Clique Interconnections
To wire the inter-router channels, the function loops through every router and every dimension `dim`. 
Within a dimension, the router must form a fully connected clique with the other `_k - 1` routers. The function loops through these neighboring routers, calculating their IDs. 
It establishes a direct unidirectional output channel to each neighbor and wires it to the neighbor's input channel. 
If `use_noc_latency` is true, the function calculates the physical wire delay based on the 2D switch distance offset (`length = _xrouter * oned + _yrouter * twod`), dynamically setting the latency of the interconnecting channel.
