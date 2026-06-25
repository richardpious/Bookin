[<- Router Architecture Index](README.md)

# Allocators and Arbiters

While buffers hold the data, **Allocators** and **Arbiters** are the brain of the router, responsible for resolving contention when multiple flits compete for limited resources. BookSim implements these contention-resolution engines in the [allocators](../../booksim/src/allocators/) and [arbiters](../../booksim/src/arbiters/) directories.

> [!NOTE]
> This document focuses on the *matching algorithms* used to acquire resources. For details on how virtual channel state and credits are managed after allocation, see the Flow Control documentation.

---

## 1. Types of Allocation in the Router

The standard IQ Router relies on two distinct allocation phases:

### 1.1 Virtual Channel (VC) Allocation
- **Goal**: Match an input Virtual Channel (containing a head flit) to an available output Virtual Channel at the downstream router.
- **Complexity**: This is a bipartite matching problem. Multiple input VCs may request the same output VC, and a single input VC might be satisfied by multiple acceptable output VCs.
- **Configuration**: Configured via the `vc_allocator` parameter.

### 1.2 Switch (Crossbar) Allocation
- **Goal**: Match an input port to an output port so a flit can traverse the crossbar switch.
- **Complexity**: Also a bipartite matching problem, but operates on a per-flit basis (head, body, and tail) rather than just per-packet. It ensures no two input ports send to the same output port simultaneously.
- **Configuration**: Configured via the `sw_allocator` parameter.

---

## 2. Matching Algorithms (Allocators)

BookSim supports several high-performance allocation algorithms to solve the bipartite matching problem.

### 2.1 iSLIP (`islip`)
- **Description**: An iterative, round-robin matching algorithm. It uses independent arbiters for inputs and outputs. Grant pointers are only updated when an accept occurs, preventing starvation and ensuring fairness.
- **Usage**: Highly recommended and used as the default for both VC and Switch allocation.

### 2.2 Parallel Iterative Matching (`pim`)
- **Description**: Similar to iSLIP, but uses random selection instead of round-robin pointers to break ties and resolve contention.
- **Usage**: Good for theoretical modeling, though harder to implement in physical hardware than iSLIP.

### 2.3 Wavefront (`wavefront`)
- **Description**: A matrix-based allocator. It resolves conflicts by evaluating requests along a diagonal "wavefront" that sweeps across the request matrix. It provides high matching efficiency in a single iteration.
- **Usage**: Excellent for Switch Allocation in architectures that require single-cycle resolution.

### 2.4 Local Optimization Allocator (`loa`)
- **Description**: An advanced allocator that attempts to maximize the total number of matches by evaluating edge weights and local topologies.

---

## 3. Underlying Arbiters

Allocators are built using smaller building blocks called **Arbiters**, which resolve $N$-to-$1$ contention (e.g., $N$ requesters competing for 1 resource). These are defined in the `arbiters/` directory.

- **Round Robin (`roundrobin`)**: Grants requests sequentially, rotating the priority pointer to ensure strict fairness.
- **Matrix (`matrix`)**: Uses a strict priority matrix. If $A$ has priority over $B$, $A$ will always win. The matrix is updated upon grants to implement Least-Recently-Granted (LRG) fairness.
- **Tree (`tree`)**: Organizes requesters into a binary tree, resolving contention pair-by-pair up to the root.

---

## 4. Configuration and Iterations

Iterative allocators (like `islip` and `pim`) can run multiple times in a single cycle to improve the matching quality. 

| Parameter | Description | Default |
|-----------|-------------|---------|
| `alloc_iters` | The number of iterations the allocator runs per cycle. Higher iterations yield better bipartite matches at the cost of hardware complexity/power. | 1 |
