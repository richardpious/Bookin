[<- Previous Page](../03_network_topology/README.md) | [Index](../index.md)

# Router Architecture

The router is the core component of the network. BookSim provides a flexible router model with a configurable pipeline.


To explore the router architecture in depth, please refer to the following guides:
- [IQ Router Pipeline](iq_router_pipeline.md): Cycle-by-cycle execution mechanics of the standard Input-Queued Router.
- [Allocators](allocators/README.md) and [Arbiters](arbiters/README.md): Contention resolution engines.
- [Crossbar and Speedup](crossbar_and_speedup.md): Switch traversal mechanics and internal speedup configuration.
- [Alternative Routers](alternative_routers.md): Details on Event-driven and Chaos routers.

## Default Router Model ([iq_router.cpp](../../booksim/src/routers/iq_router.cpp#L50))

The most common router model is the **Input-Queued (IQ)** router. It follows a standard pipeline:
1. **BW (Buffer Write)**: Incoming flits are stored in input buffers.
2. **RC (Routing Computation)**: The output port is determined.
3. **VA (VC Allocation)**: A virtual channel at the next hop is requested.
4. **SA (Switch Allocation)**: A request is made to cross the internal crossbar switch.
5. **ST (Switch Traversal)**: The flit crosses the crossbar.
6. **LT (Link Traversal)**: The flit travels across the physical link to the next router.

## Pipeline Delays

The number of cycles spent in each stage can be configured:

| Parameter | Description | Default |
|-----------|-------------|---------|
| `routing_delay` | Cycles for RC. | 1 |
| `vc_alloc_delay` | Cycles for VA. | 1 |
| `sw_alloc_delay` | Cycles for SA. | 1 |
| `st_prepare_delay` | Cycles before ST. | 0 |
| `st_final_delay` | Cycles after ST. | 1 |

## Allocators and Arbiters

For detailed information on the available allocators and arbiters, refer to their dedicated documentation:
- [Allocators](allocators/README.md)
- [Arbiters](arbiters/README.md)
Parameters: `vc_allocator`, `sw_allocator`, `alloc_iters`.

## Internal Speedup

The crossbar can be clocked faster or have more ports than the input/output links to reduce internal contention.
- `internal_speedup`: Floating point value (e.g., 2.0).
- `input_speedup`: Integer multiplier for input ports.
- `output_speedup`: Integer multiplier for output ports.

