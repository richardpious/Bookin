[<- Routing Index](README.md)

# Specialized Topology Routing

Certain hierarchical or non-standard topologies require custom routing functions that navigate their unique link structures.

---

## 1. Tree Routing: Nearest Common Ancestor (NCA)

Tree topologies (like `fattree`, `qtree`, and `tree4`) use hierarchical routing algorithms.

### 1.1 Standard NCA (`qtree_nca`, `fattree_nca`)
- **Logic**: A packet routes UP the tree from the source until it reaches a router that is a common ancestor to both the source and the destination. From that ancestor, the packet routes strictly DOWN the tree to the destination.
- **Implementation**: The router compares its "neighborhood coverage" (the range of destinations reachable via its downward links) against the packet's destination.
  - If the destination is within coverage, it computes the correct downward output port.
  - If the destination is outside coverage, it routes to an upward output port (`gK`).

```cpp
if(dest < (router_neighborhood+1)*router_coverage && dest >= router_neighborhood*router_coverage) {
  // Dest is reachable via a downward branch
  out_port = (dest - router_neighborhood*router_coverage) / router_branch_coverage;
} else {
  // Dest is outside this branch, route UP
  out_port = gK; 
}
```

### 1.2 Adaptive NCA (`fattree_anca`)
In topologies like Fat-Trees where multiple upward links exist (multiple common ancestors), `anca` adaptively selects the upward port with the most available credits to balance load. Downward routing remains deterministic.

---

## 2. Dragonfly Routing

Dragonfly topologies consist of local groups connected by global optical links.

### 2.1 Minimal Routing (`min_dragonfly`)
- **Logic**: The packet takes the shortest path. It routes locally to the router possessing the global link to the destination group, crosses the global link, and then routes locally to the destination node.

### 2.2 Valiant (Non-Minimal) Routing (`valiant_dragonfly`)
- **Logic**: To prevent congestion on specific global links during adversarial traffic patterns, Valiant routing routes the packet to a randomly selected intermediate group first, before routing it to the final destination group.
- **Deadlock Avoidance**: Because this forces packets to traverse up to two global links and multiple local links, this routing function requires strict Virtual Channel partitioning. VCs are divided into classes based on the hop phase (e.g., local source, global intermediate, local intermediate, global destination, local destination) to break cyclic dependencies.
