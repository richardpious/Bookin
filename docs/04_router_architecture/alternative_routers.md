[<- Router Architecture Index](README.md)

# Alternative Router Models

While the Input-Queued (`iq`) router is the standard cycle-accurate model, BookSim includes alternative router architectures designed for specific research scenarios.

You can select these models using the `router` configuration parameter.

---

## 1. Event Router (`event_router.cpp`)

- **Configuration**: `router = event`

### 1.1 Architecture Overview
The Event Router abandons the rigid, cycle-by-cycle combinatorial pipeline loop (`_InternalStep()`). Instead, it utilizes an **Event-Driven** simulation core. 

State transitions (like a flit arriving, or an allocation completing) are scheduled as discrete events in a priority queue sorted by timestamp. The router only executes logic when an event fires, rather than polling all ports and all stages every clock cycle.

### 1.2 Use Cases
- **Simulation Speed**: For large, lightly-loaded networks, the event-driven model can simulate significantly faster than the cycle-driven `iq` model, because it skips processing idle cycles.
- **Behavior**: It functionally models a standard virtual-channel router but abstracts away some of the strict hardware pipeline rigidities in favor of software simulation efficiency.

---

## 2. Chaos Router (`chaos_router.cpp`)

- **Configuration**: `router = chaos`

### 2.1 Architecture Overview
The Chaos Router models a highly specialized, non-standard architecture based on the concept of **Randomized / Deflection Routing**. 

Unlike the IQ router which relies on Virtual Channels and strict flow-control credits to prevent deadlocks, the Chaos router intentionally misroutes (deflects) flits when congestion occurs.

- **Central Queue**: Instead of just input buffers, the Chaos router typically employs a central shared queue.
- **Deflection**: If a packet cannot acquire its desired output port due to contention, rather than stalling and holding resources (which leads to deadlock), the Chaos router will select a random available output port and force the packet out.
- **Deroute Logic**: This forces the packet to take a non-minimal path, bouncing around the network until congestion clears.

### 2.2 Use Cases
- **Fault Tolerance**: Deflection routing is highly resilient to transient faults or broken links since packets naturally route around blockages.
- **Bufferless/Minimal-Buffer NoCs**: Architectures that cannot afford large SRAM Virtual Channel buffers often rely on deflection routing to keep flits moving in the network.
