[<- Previous Page](../03_network_topology/README.md) | [Index](../index.md)

# Routing Algorithms

Routing algorithms determine the path taken by flits from source to destination. In BookSim, routing is configured using the `routing_function` parameter.

To explore the routing implementations in depth, please refer to the following guides:
- [Deterministic Routing](deterministic_routing.md): Dimension-order routing for meshes and tori, and XY/YX variants.
- [Adaptive Routing](adaptive_routing.md): Minimal adaptive, turn-model algorithms, and randomized minimal routing.
- [Specialized Topology Routing](specialized_topology_routing.md): Nearest Common Ancestor (NCA) for trees and Valiant routing for Dragonflies.
- [Routing Function Registration](routing_function_registration.md): How to write and register custom routing functions.

## Available Routing Functions

Routing functions are often topology-specific. The registration format in the source code is usually `rfname_topologyname`.

### Mesh Topologies
- `dim_order` (XY Routing): Standard deterministic dimension-order routing. ([dim_order_mesh](../../booksim/src/routefunc.cpp#L643))
- `xy_yx`: Randomly chooses between XY and YX routing for each packet. ([xy_yx_mesh](../../booksim/src/routefunc.cpp#L476))
- `adaptive_xy_yx`: Adaptively chooses between XY and YX based on congestion. ([adaptive_xy_yx_mesh](../../booksim/src/routefunc.cpp#L404))
- `west_first`, `north_last`, `negative_first`: Turn-model based partially adaptive routing.
- `romm`: Randomized minimal routing.

### Torus Topologies
- `dim_order`: Dimension-order routing with datelines to prevent deadlocks.
- `min_adaptive`: Fully adaptive minimal routing.

### Tree Topologies
- `nca`: Nearest Common Ancestor routing. ([qtree_nca](../../booksim/src/routefunc.cpp#L75))
- `anca`: Adaptive Nearest Common Ancestor routing.

### Dragonfly Topologies
- `minimal`: Direct minimal path routing.
- `nonminimal`: Valiant-based non-minimal routing to balance load.

## Configuration

| Parameter | Description | Default |
|-----------|-------------|---------|
| `routing_function` | Name of the routing function. | `none` |
| `routing_delay` | Pipeline stages for routing computation. | 1 |

## Implementation Details

Routing functions are defined in [routefunc.cpp](../../booksim/src/routefunc.cpp). They take the current router and flit as input and populate an `OutputSet` with the valid output ports and virtual channels.

```cpp
void my_routing_func(const Router *r, const Flit *f, int in_channel, 
                     OutputSet *outputs, bool inject) {
    // Determine out_port and vc range
    outputs->Clear();
    outputs->AddRange(out_port, vc_begin, vc_end);
}
```
