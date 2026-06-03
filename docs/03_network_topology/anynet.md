[<- Topology Index](README.md)

# Custom Arbitrary Networks (AnyNet) Topology

The `anynet` topology allows you to load any arbitrary, custom graph (e.g., ring, star, irregular layout) from an external text file. It is implemented in the [AnyNet](../../booksim/src/networks/anynet.cpp) class.

---

## 1. Configuration & Text File Syntax

To load a custom graph, specify the following parameters:
```text
topology = anynet
network_file = <path_to_topology_text_file>
routing_function = min_anynet
```

### 1.1 Parser Syntax Rules
The parser reads the text file line-by-line, ignoring blank lines and comments (`#`). There are two primary connection statements:

-   **Router-to-Router Link (Unidirectional)**:
    ```text
    router <src_id> router <dest_id> <latency_cycles>
    ```
-   **Router-to-Node Link (Bidirectional)**:
    ```text
    router <router_id> node <node_id> <latency_cycles>
    ```

---

## 2. Network Construction (`_BuildNet`)

The `_BuildNet` function builds the custom network using maps populated during the parsing phase. The construction consists of dynamic switch sizing, terminal wiring, and inter-router wiring.

### 2.1 Dynamic Router Sizing
The function iterates over the list of routers. For each router, it determines the total degree (radix) by summing the number of connected terminal nodes and the number of neighboring routers. It then allocates the router using this exact dynamic radix.

### 2.2 Terminal Connections
Next, `_BuildNet` iterates over the terminal nodes attached to each router. It dynamically assigns outport indices starting from 0. Injection and ejection channels are added to the router, with latency values explicitly configured as specified in the parsed input file.

### 2.3 Inter-Router Links
Finally, the function iterates over the router-to-router link specifications. It assigns the subsequent available output ports to these links. The corresponding unidirectional channels are instantiated, their latencies are set based on the text file, and they are linked to the input ports of the destination routers.

---

## 3. Pre-Computed Routing Setup

Since custom graphs lack a uniform coordinate system, BookSim computes routing tables using Dijkstra's algorithm. The routing table maps a destination node to the correct first-hop output port on the current router. The `min_anynet` routing function uses this pre-computed lookup table for routing flits.
