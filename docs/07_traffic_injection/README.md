[<- Previous Page](../06_flow_control_buffers/README.md) | [Index](../index.md)

# Traffic Injection

Traffic injection defines how and when packets are introduced into the network by the source nodes.


To explore traffic injection and simulation management in depth, please refer to the following guides:
- [Traffic Patterns](traffic_patterns.md): Spatial distributions like uniform, bitcomp, tornado, and hotspot.
- [Injection Processes](injection_processes.md): Temporal distributions including memoryless Bernoulli and bursty On-Off.
- [Traffic Classes and Priorities](traffic_classes_and_priorities.md): Multi-class configuration, priority queuing, and read/write request/reply modeling.
- [The Traffic Manager](traffic_manager.md): The core simulation loop, packet segmentation, and steady-state convergence testing.

## Injection Processes

The `injection_process` parameter defines the temporal distribution of packet injection. Implementation details can be found in [injection.cpp](../../booksim/src/injection.cpp).

- **Bernoulli ([bernoulli](../../booksim/src/injection.cpp#L137))**: Packets are injected with a fixed probability `injection_rate` at each cycle.
- **On-Off ([on_off](../../booksim/src/injection.cpp#L151))**: A bursty traffic model that toggles between "on" (active injection) and "off" (idle) states.
  - `burst_alpha`: Probability of switching from off to on.
  - `burst_beta`: Probability of switching from on to off.

## Traffic Patterns

The `traffic` parameter defines the spatial distribution (destination nodes). Implementation details can be found in [traffic.cpp](../../booksim/src/traffic.cpp).

| Pattern | Description |
|---------|-------------|
| `uniform` | Destinations are chosen uniformly at random. ([uniform](../../booksim/src/traffic.cpp#L380)) |
| `bitcomp` | Destination is the bitwise complement of the source ID. ([bitcomp](../../booksim/src/traffic.cpp#L217)) |
| `transpose` | Source $(i, j)$ sends to destination $(j, i)$. ([transpose](../../booksim/src/traffic.cpp#L230)) |
| `shuffle` | Destination is a cyclic left shift of the source ID bits. ([shuffle](../../booksim/src/traffic.cpp#L269)) |
| `tornado` | Destinations are shifted by $(k/2 - 1)$ in each dimension. ([tornado](../../booksim/src/traffic.cpp#L289)) |
| `neighbor` | Destination is the immediate neighbor in the first dimension. ([neighbor](../../booksim/src/traffic.cpp#L310)) |
| `hotspot` | Certain nodes receive a higher fraction of traffic. ([hotspot](../../booksim/src/traffic.cpp#L490)) |

## Packet and Flit Configuration

- `packet_size`: Number of flits per packet.
- `injection_rate`: The rate at which traffic is injected (packets per node per cycle).
- `injection_rate_uses_flits`: If set to 1, the injection rate is interpreted as flits per cycle.

## Multiple Traffic Classes

BookSim supports multiple traffic classes (e.g., for different priority levels or message types).
- `classes`: Number of traffic classes.
- Many parameters (like `injection_rate` and `priority`) can be specified as a list (e.g., `injection_rate = {0.1, 0.05}`) to apply different values to each class.
