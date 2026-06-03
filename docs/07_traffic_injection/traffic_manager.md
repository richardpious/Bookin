[<- Traffic Injection Index](README.md)

# The Traffic Manager

The [TrafficManager](../../booksim/src/trafficmanager.cpp) is the orchestration engine of BookSim. While the Router classes simulate the physical hardware, the `TrafficManager` simulates the processors/nodes attached to the network and manages the overarching simulation time loop.

---

## 1. The Simulation Loop (`Run()`)

The `TrafficManager::Run()` method is the heart of the simulator. For every clock cycle, it performs the following steps:

1. **Step 1: Evaluate Routers**: Calls `_Step()` on all network routers to advance flits through pipelines.
2. **Step 2: Eject Flits**: Polls the ejection channels at every node. If a flit arrived, it is removed from the network and statistics are recorded. If a tail flit arrived, the packet's latency is calculated.
3. **Step 3: Inject Flits**: Polls the injection process for every node. If a new packet is generated, it is broken into flits and enqueued into the node's injection buffer, waiting to enter the network.
4. **Step 4: Record Stats**: Periodically evaluates whether the network has warmed up or reached a stable state.

## 2. Packet vs. Flit Generation

The `TrafficManager` is responsible for segmenting packets.
- When an injection process (e.g., `bernoulli`) triggers, a **Packet** is logically generated.
- The manager reads `packet_size` and creates a sequence of **Flits**:
  - `Flit::HEAD`: Contains routing information and destination address.
  - `Flit::BODY`: Contains the payload (can be 0 or more).
  - `Flit::TAIL`: Marks the end of the packet, signaling the router to release the Virtual Channel.
  
If `packet_size = 1`, a single `Flit::HEAD_TAIL` is generated.

## 3. Simulation Phases and Convergence

The Traffic Manager automatically divides the simulation into phases to ensure statistically significant results.

### 3.1 Warmup Phase
When the simulation begins, the network is empty. Data collected here would skew the average latency downward. 
- The manager runs for `warmup_periods * sample_period` cycles.
- It continuously tracks the average latency.
- If the change in latency between periods is less than `warmup_thres`, the network is considered "warmed up", and the manager resets all statistics counters to begin the true measurement phase.

### 3.2 Measurement (Stopping) Phase
Once warmed up, the manager continues running and sampling.
- It stops running once it has collected `max_samples` periods, **or** if the change in latency between periods drops below `stopping_thres`, indicating the network has reached a steady state.
- **Saturation**: If the average latency exceeds `latency_thres` (e.g., 500 cycles), the manager aborts the simulation, classifying the network as saturated (unstable) under the current injection rate.
