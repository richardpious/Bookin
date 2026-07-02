[<- Previous Page](../05_routing/README.md) | [Index](../index.md)

# Flow Control and Buffers

BookSim uses credit-based flow control to manage buffer space and prevent overflow. Virtual channels (VCs) are used to multiplex physical links and avoid deadlocks.


To explore flow control and buffers in depth, please refer to the following guides:
- [Virtual Channels](virtual_channels.md): VC states, lifecycles, and wait-for-tail mechanics.
- [Buffer Management](buffer_management.md): Private vs. shared buffer allocation policies and overflow protection.
- [Credit-Based Flow Control](credit_flow_control.md): Tracking downstream buffer state and modeling wire credit delays.
- [Speculative Allocation](speculative_allocation.md): How speculation bypasses pipeline dependencies to reduce latency.

## Virtual Channels

VCs allow multiple packets to share a single physical link by partitioning the input buffers. Implementation of virtual channels can be found in [vc.cpp](../../booksim/src/vc.cpp#L48) and overall buffer management in [buffer.cpp](../../booksim/src/buffer.cpp#L34).

| Parameter | Description | Default |
|-----------|-------------|---------|
| `num_vcs` | Number of virtual channels per physical port. | 16 |
| `vc_buf_size` | Number of flits per VC buffer. | 8 |
| `wait_for_tail_credit` | If 1, a VC is not reallocated until the tail flit's credit is received. | 0 |

## Buffer Management

BookSim supports different buffer allocation policies:

- **Private (`private`)**: Each VC has a fixed amount of dedicated buffer space (`vc_buf_size`).
- **Shared (`shared`)**: VCs share a common buffer pool (`buf_size`). This can improve buffer utilization but requires careful management to ensure fairness.

## Speculative Allocation

Speculation can reduce latency by allowing a flit to request switch allocation before it has secured a virtual channel at the next hop.

| Parameter | Description | Default |
|-----------|-------------|---------|
| `speculative` | Enables speculative switch allocation. | 0 |
| `spec_check_cred` | Checks for available credits during speculation. | 1 |

## Credit-Based Flow Control

When a flit is forwarded, a credit is consumed. Credits are sent back to the upstream router once the flit leaves the current buffer, signaling that space is available.

- `credit_delay`: The number of cycles it takes for a credit to travel back to the upstream router.
