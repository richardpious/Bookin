[<- Flow Control Index](README.md)

# Virtual Channels

Virtual Channels (VCs) are a critical concept in Network-on-Chip design, allowing a single physical link to be multiplexed among multiple packets. In BookSim, VC state and behavior are primarily implemented in the [VC](../../booksim/src/vc.cpp) class.

---

## 1. Why Virtual Channels?

Without VCs, a packet blocked in a router buffer halts all subsequent packets behind it, causing Head-of-Line (HoL) blocking. Worse, in many topologies, this can lead to cyclic buffer dependencies and **deadlock**. 

By dividing the physical port buffer into multiple logical queues (Virtual Channels), blocked packets only hold up their specific VC, while packets in other VCs can bypass them and continue utilizing the physical link bandwidth.

## 2. Configuration Parameters

| Parameter | Description | Default |
|-----------|-------------|---------|
| `num_vcs` | Total number of virtual channels per physical input port. | 16 |
| `vc_buf_size` | Number of flits each individual VC can hold. | 8 |

## 3. VC State Lifecycle

A Virtual Channel tracks the state of the packet it currently holds. A VC progresses through several states during a packet's lifetime:

1. **`idle`**: The VC is empty and available for a new packet.
2. **`routing`**: A head flit has arrived. The router is currently computing the output port(s) and acceptable output VCs.
3. **`vc_alloc`**: The routing computation is complete. The head flit is waiting to acquire an output VC at the next downstream router.
4. **`active`**: An output VC has been secured. The VC is actively holding flits (head, body, or tail) that are competing for switch allocation to traverse the crossbar.

Once the tail flit departs the router, the VC must be freed so it can be reallocated to a new packet.

## 4. Reallocation Policy

By default, BookSim frees a VC as soon as the tail flit departs. However, depending on the downstream router's implementation, it might not be safe to immediately re-use that VC until the downstream router acknowledges receipt of the tail flit.

| Parameter | Description | Default |
|-----------|-------------|---------|
| `wait_for_tail_credit` | If set to 1, the VC remains in a "waiting" state after the tail flit leaves. It will not transition back to `idle` until the credit for the tail flit is received from the downstream router. | 0 |
