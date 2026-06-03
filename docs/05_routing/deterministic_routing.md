[<- Routing Index](README.md)

# Deterministic Routing

Deterministic routing algorithms guarantee that a packet will always take the same path between a given source and destination, regardless of current network congestion. In BookSim, these algorithms are highly optimized and widely used for standard baseline comparisons.

---

## 1. Dimension-Order Routing (DOR) for Mesh (`dim_order_mesh`)

Dimension-Order Routing (often called XY routing in 2D meshes) routes packets completely in one dimension before moving to the next.

- **Routing Function**: `dim_order_mesh`
- **Implementation**: The core logic is handled by `dor_next_mesh` in `routefunc.cpp`.
- **Mechanics**: 
  - The algorithm compares the current node coordinates with the destination coordinates.
  - It resolves differences in the $X$ dimension first. If `cur_x != dest_x`, the flit is routed left or right.
  - Once `cur_x == dest_x`, it routes in the $Y$ dimension.
- **Deadlock Freedom**: Because turns are strictly limited (e.g., you can turn from X to Y, but never Y to X), cycles are impossible, ensuring deadlock freedom without requiring multiple Virtual Channels.

```cpp
int dor_next_mesh( int cur, int dest, bool descending = false ) {
  if ( cur == dest ) return 2*gN;  // Eject
  
  int dim_left;
  // Loop through dimensions to find the first differing dimension
  for ( dim_left = 0; dim_left < ( gN - 1 ); ++dim_left ) {
    if ( ( cur % gK ) != ( dest % gK ) ) { break; }
    cur /= gK; dest /= gK;
  }
  
  if ( (cur % gK) < (dest % gK) ) {
    return 2*dim_left;     // Route Right
  } else {
    return 2*dim_left + 1; // Route Left
  }
}
```

## 2. Dimension-Order Routing for Torus (`dim_order_torus`)

Torus topologies feature wrap-around links. While DOR prevents dimension-turn deadlocks, the wrap-around links introduce cyclic dependencies within a single dimension (ring deadlocks).

- **Routing Function**: `dim_order_torus`
- **Dateline Mechanism**: To break the ring deadlock, BookSim employs a "dateline." If a packet crosses the physical link between node `k-1` and node `0`, it is forced to transition to a higher Virtual Channel. 
- **Requirement**: This routing function requires at least 2 Virtual Channels per traffic class to function without deadlocking.

## 3. Randomized Deterministic Routing (`xy_yx_mesh`)

While strictly deterministic per packet, this routing function randomly selects between `XY` (route X then Y) and `YX` (route Y then X) at the time of injection.

- **Routing Function**: `xy_yx_mesh`
- **Mechanics**: Upon injection, a coin flip determines the route order. 
- **Deadlock Avoidance**: Because both `XY` and `YX` are permitted, turn-cycles are possible. To prevent deadlock, the available VCs are split in half. Packets taking the `XY` route are restricted to the lower half of the VCs, and `YX` packets use the upper half.

```cpp
// Route order (XY or YX) determined when packet is injected
bool x_then_y = ((in_channel < 2*gN) ?
                 (f->vc < (vcBegin + available_vcs)) :
                 (RandomInt(1) > 0));

if(x_then_y) {
  out_port = dor_next_mesh( r->GetID(), f->dest, false ); // XY
} else {
  out_port = dor_next_mesh( r->GetID(), f->dest, true );  // YX
}
```
