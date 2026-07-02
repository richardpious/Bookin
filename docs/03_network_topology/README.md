[<- Index](../index.md)

# Network Topology

BookSim supports a wide range of in-built network topologies and custom, arbitrary graphs. The topology is specified using the `topology` parameter in your configuration file.

---

## 1. Available Topologies

BookSim includes implementations for several traditional regular grids, high-radix direct on-chip networks, hierarchical tree systems, and custom configurations. Click on any topology below for an in-depth explanation of its C++ `_BuildNet` construction logic:

### Regular Grid & Mesh Topologies
*   **[Mesh / Torus (kncube.md)](kncube.md)**: Standard $N$-dimensional grid structure with optional edge wrap-around torus connections.
*   **[Concentrated Mesh (cmesh.md)](cmesh.md)**: An on-chip concentrated mesh with clustered node groupings and express boundary links.

### High-Radix Direct Topologies
*   **[Flattened Butterfly (flatfly.md)](flatfly.md)**: A high-radix on-chip direct topology utilizing fully connected dimensions.
*   **[Dragonfly (dragonfly.md)](dragonfly.md)**: A hierarchical topology utilizing tightly coupled switch groups and global inter-group channels.

### Hierarchical Tree Topologies
*   **[Fat-Tree (fattree.md)](fattree.md)**: A multi-stage indirect network featuring varying switch radix sizes across hierarchical stages.
*   **[Quad Tree (qtree.md)](qtree.md)**: A quad-tree indirect network featuring 4 descending links per parent router.
*   **[4-ary Tree (tree4.md)](tree4.md)**: A specialized 64-node tree topology featuring 4 root-level switches.

### Stage & Custom Topologies
*   **[Butterfly Stage (fly.md)](fly.md)**: A classic multi-stage indirect butterfly stage layout.
*   **[Arbitrary Networks (anynet.md)](anynet.md)**: A custom topology loader that builds unidirectional and bidirectional networks from text configuration files.

---

## 2. Topology-Routing Compatibility

Routing functions in BookSim are dependent on the physical topology. Setting a mismatching routing function will lead to packet loss, deadlock, or simulation runtime failures. 

> [!WARNING]
> Ensure your `routing_function` matches your `topology` configuration:

| Topology | Supported `topology` config | Valid `routing_function` parameters |
| :--- | :--- | :--- |
| **Mesh / Torus** | `mesh`, `torus` | `dim_order`, `xy_yx`, `adaptive_xy_yx`, `west_first`, `north_last`, `negative_first`, `romm`, `min_adaptive` |
| **Concentrated Mesh** | `cmesh` | `dim_order_cmesh`, `dor_cmesh` |
| **Flattened Butterfly** | `flatfly` | `ran_min_flatfly`, `adaptive_xyyx_flatfly`, `xyyx_flatfly`, `valiant_flatfly`, `ugal_flatfly`, `ugal_pni_flatfly`, `ugal_xyyx_flatfly` |
| **Dragonfly** | `dragonflynew` | `min_dragonflynew`, `ugal_dragonflynew` |
| **Trees (FatTree / QTree)** | `fattree`, `qtree`, `tree4` | `nca`, `anca` |

---

## 3. Spatial & Latency Modeling

By default, BookSim models link latency based on the layout's physical coordinates to estimate wire delay realistically.

### The `use_noc_latency` Parameter
When `use_noc_latency = 1` is configured, BookSim overrides simple single-cycle hop times by calculating spatial latencies:
- **Concentration Links**: Latency of node-to-router injection/ejection channels is calculated dynamically based on client coordinates relative to the router (e.g., in concentrated meshes and flattened butterflies).
- **Inter-Router Links**: Channel latencies are scaled proportionally to the Manhattan distance between the source and destination switch coordinates in the virtual 2D grid.

### Hidden/Hardcoded Latencies
Certain topologies have hardcoded physical latency values embedded directly in their source implementations:
- **Dragonfly (`dragonflynew`)**: In [dragonfly.cpp](../../booksim/src/networks/dragonfly.cpp#L283-L300), inter-switch channels have specific latencies built-in (active when the `DRAGON_LATENCY` macro is defined):
  - **Intra-group** local links: **10 cycles** latency.
  - **Inter-group** optical links: **100 cycles** latency.

---

## 4. Custom Networks with `anynet`

`anynet` enables you to define any arbitrary graph (e.g., rings, stars, random topologies) using a configuration text file loaded via the `network_file` parameter.

### Syntax
Each line in the topology file represents a directed link.

- **Router-to-Router link**:
  ```text
  router <src_id> port <src_port> -> router <dest_id> port <dest_port>
  ```
- **Node-to-Router injection/ejection link**:
  ```text
  node <node_id> -> router <router_id> port <router_port>
  ```

### Example: A 3-Router Ring (with 1 Concentrated Node each)
Create a text file (e.g., `triangle.txt`) with the following definition:

```text
# Inter-router links forming a ring
router 0 port 1 -> router 1 port 1
router 1 port 2 -> router 2 port 1
router 2 port 2 -> router 0 port 2

# Symmetrical reverse directions
router 1 port 1 -> router 0 port 1
router 2 port 1 -> router 1 port 2
router 0 port 2 -> router 2 port 2

# Processor nodes attached to each router
node 0 -> router 0 port 0
node 1 -> router 1 port 0
node 2 -> router 2 port 0
  ```

---

## 5. Topology Dumps

If you are writing a custom topology parser or debugging complex configurations like Dragonfly, BookSim provides built-in methods to export the compiled topology directly:

*   **`DumpChannelMap`**: Prints the full interconnection matrix of channels (`source_router,source_port,dest_router,dest_port`).
*   **`DumpNodeMap`**: Prints terminal-to-router mapping.

These functions are defined in [network.cpp](../../booksim/src/networks/network.cpp#L260-L290).

---

## 6. Fault Injection & Link Failures

BookSim provides standard support for evaluating network resilience under hardware failures:

- **`link_failures`**: An integer configuration parameter that specifies the number of random link faults to introduce in the network at simulation startup.
- The topology builder calls `InsertRandomFaults(config)` in [network.cpp](../../booksim/src/networks/network.cpp#L121). 
- *Note*: Fault injection is implemented selectively by specific topologies (e.g. standard `kncube` mesh/torus) that support fault-tolerant routing validation.