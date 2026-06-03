[<- Flow Control Index](README.md)

# Credit-Based Flow Control

To prevent buffer overflows, upstream routers must know how much buffer space is available at downstream routers before transmitting a flit. BookSim uses **Credit-Based Flow Control**, managed by the [BufferState](../../booksim/src/buffer_state.cpp) class.

---

## 1. How Credits Work

1. **Initialization**: At simulation start, the upstream router is given a credit count for each downstream VC equal to that VC's maximum buffer size.
2. **Transmission**: Whenever the upstream router sends a flit to downstream VC *i*, it decrements its local credit counter for VC *i*. If the counter is 0, the upstream router stalls transmission for that VC.
3. **Consumption**: The flit arrives at the downstream router and is stored in VC *i*.
4. **Departure**: The flit eventually wins switch allocation and departs the downstream router, freeing up one slot in VC *i*.
5. **Replenishment**: The downstream router sends a "credit" packet back upstream.
6. **Receipt**: The upstream router receives the credit and increments its counter for VC *i*, allowing it to send another flit.

## 2. Modeling Credit Delay

Because physical wires have delay, a credit takes time to travel upstream. BookSim models this using the `credit_delay` parameter.

| Parameter | Description | Default |
|-----------|-------------|---------|
| `credit_delay` | The number of cycles it takes for a credit to travel from the downstream router back to the upstream router's counter. | 1 |

*Note*: The total round-trip time (RTT) for a credit loop is:
`Link Traversal + Router Pipeline (Downstream) + Credit Delay`. 
If `vc_buf_size` is smaller than the RTT, the upstream router will run out of credits and stall even if the downstream router is emptying its buffers instantly, leading to under-utilization.

## 3. The `BufferState` Class

The `BufferState` object lives in the upstream router and tracks the state of the downstream router's buffers.

- **`_vcs`**: A vector tracking the state of each downstream VC (idle, active).
- **`ProcessCredit()`**: Method called when a credit arrives. It increments the `_vcs[c].credit_count`.
- **`IsAvailableFor(vc)`**: Method used by the upstream VC Allocator to verify if a downstream VC has space and is in the `idle` state before assigning it to a new packet.
