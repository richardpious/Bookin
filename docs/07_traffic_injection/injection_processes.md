[<- Traffic Injection Index](README.md)

# Injection Processes

While the traffic pattern defines *where* a packet goes, the **Injection Process** defines *when* the packet is generated. This models the temporal distribution of traffic entering the network from the processing nodes. It is implemented in [injection.cpp](../../booksim/src/injection.cpp) and configured via the `injection_process` parameter.

---

## 1. Bernoulli Process (`bernoulli`)

The Bernoulli injection process is a memoryless distribution. 

- **Description**: At every cycle, the source node flips a weighted coin. With probability equal to the `injection_rate`, a new packet is generated.
- **Characteristics**: This is the default and most widely used injection process. It produces a smooth, random distribution of packets over time without clustering.

## 2. Bursty On-Off Process (`on_off`)

The On-Off process models bursty traffic, which is highly characteristic of real-world computing workloads (e.g., DMA transfers, cache evictions) where nodes are idle for long periods and then suddenly inject many packets back-to-back.

### 2.1 Mechanics
The source node exists in a two-state Markov chain:
1. **ON State**: The node injects packets continuously.
2. **OFF State**: The node injects nothing (idle).

### 2.2 Transition Probabilities
The process is controlled by two configuration parameters:
- `burst_alpha`: The probability of transitioning from the OFF state to the ON state.
- `burst_beta`: The probability of transitioning from the ON state to the OFF state.

```cpp
if(state == ON) {
    if(RandomFloat() < burst_beta) state = OFF;
} else {
    if(RandomFloat() < burst_alpha) state = ON;
}
```
*Note: The actual average `injection_rate` for the `on_off` process is derived mathematically from `burst_alpha` and `burst_beta`.*

## 3. Injection Rate Scaling

The `injection_rate` parameter specifies the load. 
- By default, `injection_rate = 0.1` means 0.1 **packets** per node per cycle.
- If `injection_rate_uses_flits = 1` is configured, the rate is interpreted as **flits** per node per cycle. For example, an injection rate of 0.1 flits/cycle with a `packet_size` of 5 flits means 1 packet is generated every 50 cycles on average.
