[<- Network Topology Index](README.md)

# Dragonfly Topology

The Dragonfly hierarchical topology features tightly-connected local groups of switches joined by long-distance global optical channels. It is implemented in the [DragonFlyNew](../../booksim/src/networks/dragonfly.cpp) class. Set `topology = dragonflynew` to use.

---

## 1. Parameters & Group Architecture

-   **`k` (`_p`)**: Switch local radix (defines the number of concentrated terminal ports per switch).
-   **`n` (`_n`)**: Group dimension (currently restricted to `1`).

### 1.1 Structural Metrics
-   **Routers per Group (`_a`)**: `2 * _p`
-   **Group Count (`_g`)**: `_a * _p + 1`
-   **Total Switches**: `_a * _g`
-   **Switch Total Radix**: `_p` (local nodes) + `(2*p - 1)` (intra-group) + `_p` (inter-group)

---

## 2. Network Construction (`_BuildNet`)

The `_BuildNet` function creates the topology by instantiating routers and methodically linking three distinct networks: terminal, intra-group (local), and inter-group (global).

### 2.1 Router Allocation
The function iterates over all switches (from `0` to `_num_of_switch - 1`). For each, it determines its Group ID and allocates a router with the computed full radix.

### 2.2 Terminal Connections
For each router, the first `_p` ports are connected to local terminal nodes. The function loops `_p` times, adding injection and ejection channels to connect processors directly to the router.

### 2.3 Intra-Group Routing (Local Network)
The function establishes a fully-connected clique within each group. For a given router, it loops over the other `2*p - 1` routers within the same group. It adds output channels to these neighboring routers. If `DRAGON_LATENCY` is defined, these intra-group links are assigned a 10-cycle latency. Corresponding input channels from other routers in the group are similarly mapped using mathematical offsets.

### 2.4 Inter-Group Routing (Global Network)
To link different groups, the function maps global channels. Each router is assigned `_p` global ports. By calculating the target group ID, the builder ensures that every group has exactly one direct channel to every other group in the network. These output and input channels represent long-distance optical links. If `DRAGON_LATENCY` is defined, these global links are assigned a 100-cycle latency.
