[<- Topology Index](README.md)

# Crossbar and Speedup

The core physical component of a router is the **Crossbar Switch**, which forms the datapath connecting input ports to output ports. The Switch Traversal (ST) pipeline stage models flits crossing this internal fabric.

---

## 1. Switch Traversal Mechanics

Once a flit successfully secures a match in the Switch Allocation (SA) stage, it is scheduled to traverse the crossbar.

1. **Dequeue**: The flit is popped from the front of its virtual channel buffer.
2. **Delay**: The flit waits in an internal pipeline register for `st_prepare_delay` cycles.
3. **Traversal**: The flit physically crosses the crossbar.
4. **Egress**: After `st_final_delay` cycles, the flit arrives at the output port and is pushed onto the egress link.

---

## 2. Structural Speedup

To reduce internal contention and improve the maximum throughput of the router, BookSim allows you to configure the bandwidth of the router's internals relative to the physical network links. This is known as **Speedup**.

Speedup is modeled by allowing multiple flits to be read from a single input port, or written to a single output port, in a single clock cycle.

### 2.1 Internal Speedup
- **Parameter**: `internal_speedup` (float, e.g., 1.5, 2.0)
- **Description**: Scales the operating frequency of the internal crossbar relative to the external links.
- **Mechanism**: If `internal_speedup = 2.0`, the router executes two `_InternalStep()` pipeline evaluations for every single global network cycle. This effectively doubles the crossbar throughput and halves the internal queueing delays.

### 2.2 Input Port Speedup
- **Parameter**: `input_speedup` (int, default: 1)
- **Description**: Defines how many flits can be read from a single physical input port in a single cycle.
- **Mechanism**: Setting `input_speedup = 2` models a crossbar with two distinct internal read ports for every physical input link. This allows the Switch Allocator to grant two crossbar traversal requests from the same physical input port simultaneously (provided they belong to different VCs and target different output ports).

### 2.3 Output Port Speedup
- **Parameter**: `output_speedup` (int, default: 1)
- **Description**: Defines how many flits can be written to a single physical output port in a single cycle.
- **Mechanism**: Setting `output_speedup = 2` models an output port with an expansion factor. The Switch Allocator can grant requests to two different input ports targeting the *same* physical output port in the same cycle. 
- **Requirement**: Because physical links can only carry one flit per cycle, Output Port Speedup requires **Next-Hop-Output Queueing (NOQ)**. You must set `noq = 1`, which instantiates buffers at the output ports to hold the extra flits before they are serialized onto the physical link.
