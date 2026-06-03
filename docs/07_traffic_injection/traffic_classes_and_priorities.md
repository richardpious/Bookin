[<- Traffic Injection Index](README.md)

# Traffic Classes and Priorities

Modern Networks-on-Chip (NoCs) often carry heterogeneous traffic (e.g., critical cache coherence messages, bulk DMA data transfers, and standard I/O). BookSim models this using **Traffic Classes**.

---

## 1. Defining Traffic Classes

You can simulate multiple traffic classes simultaneously using the `classes` parameter.

| Parameter | Description | Default |
|-----------|-------------|---------|
| `classes` | Total number of distinct traffic classes in the simulation. | 1 |

When `classes > 1` is configured, many configuration parameters become arrays. You can define properties per-class using brace syntax:
```text
classes = 2
injection_rate = {0.1, 0.05}
packet_size = {1, 5}
```
In this example, Class 0 injects 1-flit packets at a rate of 0.1, while Class 1 injects 5-flit packets at a rate of 0.05.

## 2. Read / Write Simulation

A common NoC benchmark is simulating a shared-memory architecture with Read and Write requests/replies. BookSim provides built-in support for this workload.

- **Enable**: Set `use_read_write = 1`
- **Behavior**: Source nodes inject Read or Write *requests*. When a destination node receives a request, it automatically generates a corresponding *reply* packet and injects it back into the network targeting the original source.

### 2.1 Read/Write Parameters
You can independently configure the packet sizes for the four message types to model short control packets and long data payloads.

| Parameter | Description | Default |
|-----------|-------------|---------|
| `read_request_size` | Size (in flits) of a Read Request (Control). | 1 |
| `read_reply_size` | Size (in flits) of a Read Reply (Data). | 1 |
| `write_request_size` | Size (in flits) of a Write Request (Data). | 1 |
| `write_reply_size` | Size (in flits) of a Write Reply (Control). | 1 |

To prevent protocol-level deadlocks (where requests block replies), you must isolate these message types into separate Virtual Channels using the `*_begin_vc` and `*_end_vc` parameters.

## 3. Prioritized Traffic

BookSim supports strict priority queuing to ensure critical traffic bypasses less important traffic in the router pipeline.

- **Configuration**: Set `priority = class` or `priority = age`.
- **Mechanics**: When the router's VC Allocator or Switch Allocator has multiple requesters competing for a single port, it evaluates the `f->pri` (priority field) of the competing flits. 
- **Priority Classes**: If configured by class, Class 0 might strictly beat Class 1.
- **Priority Age**: If configured by age, older flits beat newer flits, inherently preventing starvation and improving worst-case latency tail bounds.
