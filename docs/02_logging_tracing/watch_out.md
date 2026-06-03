[<- Previous Page](../01_running_simulations/README.md) | [Index](../index.md)

# watch_out

`watch_out` is a configuration parameter that controls where BookSim logs detailed, cycle-by-cycle tracking traces for specific monitored packets or flits. Watching is one of the most powerful features in BookSim for low-level routing verification, deadlock analysis, and pipeline-level troubleshooting.

## How to Use

Set `watch_out` in your configuration file to a target filename, or set it to `-` to redirect watch logs directly to the standard console output:

```
watch_out = watch_out.txt
```

To tell BookSim which packets or flits to track, configure one of the following parameters:

```
# Track specific flits by their IDs
watch_flits = {1234, 5678}

# Track specific packets by their IDs
watch_packets = {99}

# OR load a line-separated watchlist file containing IDs
watch_file = watchlist.txt
```

*Note: In `watch_file.txt`, prefixing an ID with `p` tracks a packet (e.g. `p99`), whereas a plain number tracks a flit (e.g. `1234`).*

## Output Format

When tracking is active, BookSim will log detailed cycle-by-cycle state transitions. Each logged event is written on its own line using a pipe-delimited format:

```
35 | router_0_0 | Received flit 1234 from channel at input 2.
35 | router_0_0 | Adding flit 1234 to VC 0 at input 2 (state: idle, empty).
35 | router_0_0 | Beginning routing for VC 0 at input 2 (front: 1234).
36 | router_0_0 | Completed routing for VC 0 at input 2 (front: 1234).
36 | router_0_0 | Beginning VC allocation for VC 0 at input 2 (front: 1234).
36 | router_0_0 |   Requesting VC 1 at output 1 (in_pri: 0, out_pri: 0).
36 | router_0_0 | Assigning VC 1 at output 1 to VC 0 at input 2.
37 | router_0_0 | Beginning switch allocation for VC 0 at input 2 (front: 1234).
38 | router_0_0 | Switch allocation succeeded for VC 0 at input 2 (match output: 1).
38 | router_0_0 | Flit 1234 bypasses output queue at output 1.
38 | router_0_0 | Transmitting flit 1234 to channel at output 1.
39 | flitchannel_0_0 | Flit 1234 arrived at channel head.
```

## Detailed Breakdown

Each logged line contains three pipe-delimited (`|`) columns:

$$\text{Simulation Cycle} | \text{Component Name} | \text{Log/Activity Message}$$

### 1. Simulation Cycle / Time
The first column indicates the exact simulation step (in cycles) at which the hardware-level event occurred.

### 2. Component Name
The second column identifies the specific hardware module or subcomponent executing the action, such as:
* `router_X_Y` - The specific router instance in the network.
* `router_X_Y/vc_allocator` - The virtual channel allocator inside a router (logs internal requests, arbitrations, and grants).
* `flitchannel_A_B` - A physical channel connecting two routers or a node and a router.

### 3. Log / Activity Message
The third column is a descriptive message detailing the specific pipeline phase or hardware action:
* **Arrival (`Received flit...`)**: The monitored flit is received from an input physical channel.
* **Buffer Write (`Adding flit... to VC...`)**: The flit is stored in a router's input virtual channel buffer.
* **Routing Computation (`Beginning/Completed routing...`)**: The routing engine determines the output port(s) for the packet header.
* **Virtual Channel Allocation (`Beginning VC allocation...`)**: The router requests a free virtual channel at the downstream router. If blocked, it records the cause (e.g. `VC is in use by...` or `VC is full`).
* **Switch Allocation (`Beginning switch allocation...`)**: The flit requests time on the internal crossbar switch. It logs successful grants (`Switch allocation succeeded`) or arbitration failures (`Switch allocation failed`).
* **Link Traversal (`Transmitting flit...`)**: The flit crosses the crossbar and is sent onto the downstream channel.
