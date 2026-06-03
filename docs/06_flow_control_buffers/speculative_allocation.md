[<- Flow Control Index](README.md)

# Speculative Allocation

Speculative Allocation is a performance optimization used in advanced router pipelines to reduce per-packet latency. 

---

## 1. The Standard Pipeline Dependency

In the standard IQ router pipeline, Switch Allocation (SA) has a strict dependency on Virtual Channel Allocation (VA). 
A head flit **must** secure an output VC during the VA stage before it is allowed to enter the SA stage and request the crossbar. 
This means a head flit takes a minimum of `routing_delay + vc_alloc_delay + sw_alloc_delay` cycles to cross the router.

## 2. The Speculative Optimization

If `speculative = 1` is configured, the router breaks the strict dependency. 

When a head flit completes Routing Computation (RC), it enters the VA stage. However, *in the exact same cycle*, it **speculatively** enters the SA stage as well.
- The flit assumes (speculates) that it will successfully acquire a VC.
- It competes for the crossbar switch alongside other non-speculative flits.

### 2.1 Resolution Outcomes
- **Success**: If the flit wins VA and wins SA in the same cycle, speculation succeeds. The packet saves `vc_alloc_delay` cycles of latency.
- **Failure**: If the flit wins SA but fails VA, the crossbar grant is wasted (the flit cannot leave because it has no downstream VC). The flit must try again in the next cycle.
- **Priority**: Non-speculative requests (flits that already have a VC) always have strictly higher priority in the Switch Allocator than speculative requests.

## 3. Configuration

| Parameter | Description | Default |
|-----------|-------------|---------|
| `speculative` | Enables speculative switch allocation. | 0 |
| `spec_check_cred` | If enabled, a flit will only speculate if there are known available credits for at least one acceptable downstream VC. | 1 |
| `spec_check_elig` | If enabled, a flit will only speculate if the target VC is explicitly eligible (not just having credits). | 1 |

Speculation is highly effective at reducing latency at low network loads (where VA and SA typically succeed instantly). However, at high loads, aggressive speculation can waste switch allocation bandwidth on flits that fail VA, leading to a slight degradation in maximum throughput.
