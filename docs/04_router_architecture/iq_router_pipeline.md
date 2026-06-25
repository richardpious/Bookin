[<- Router Architecture Index](README.md)

# Input-Queued Router Pipeline (`iq_router.cpp`)

The **Input-Queued (IQ) Router** is the default and most comprehensively modeled router architecture in BookSim. It implements a standard cycle-accurate, multi-stage pipeline typical of modern Network-on-Chip (NoC) routers. It is implemented in the [IQRouter](../../booksim/src/routers/iq_router.cpp) class.

---

## 1. Pipeline Stages

When a flit arrives at a router, it progresses through a strict sequence of pipeline stages. The IQ Router manages this state progression within its `_InternalStep()` evaluation loop.

### 1.1 Buffer Write (BW)
When a flit arrives at an input port, it is written into the designated virtual channel buffer. This happens asynchronously to the main router pipeline evaluation.

### 1.2 Routing Computation (RC)
- **Role**: Head flits evaluate the routing function to determine their desired output port(s) and acceptable output Virtual Channels.
- **Implementation**: The router invokes the configured routing function (found in `routefunc.cpp`). The results are stored in an `OutputSet`.
- **Delay Config**: Controlled by `routing_delay` (default: 1 cycle).
- **Note**: Body and tail flits bypass this stage, inheriting the routing decisions made by their head flit.

### 1.3 Virtual Channel Allocation (VA)
- **Role**: The head flit requests an available Virtual Channel at the downstream router.
- **Implementation**: The router gathers all RC requests and passes them to the **VC Allocator**. If successful, the flit secures a VC for the entire packet.
- **Delay Config**: Controlled by `vc_alloc_delay` (default: 1 cycle).

### 1.4 Switch Allocation (SA)
- **Role**: Flits (head, body, and tail) that have secured an output VC compete for access to the internal crossbar switch.
- **Implementation**: The router aggregates requests and passes them to the **Switch Allocator**. This resolves contention when multiple input ports want to send flits to the same output port simultaneously.
- **Delay Config**: Controlled by `sw_alloc_delay` (default: 1 cycle).

### 1.5 Switch Traversal (ST)
- **Role**: The flit physically traverses the internal crossbar from the input buffer to the output port.
- **Implementation**: Flits that won SA are moved out of their input buffers and queued for link traversal.
- **Delay Config**: Controlled by `st_prepare_delay` (before traversal, default 0) and `st_final_delay` (after traversal, default 1).

### 1.6 Link Traversal (LT)
- **Role**: The flit propagates across the physical wire to the next router.
- **Implementation**: The router pushes the flit onto the output channel object, which models the wire delay before arriving at the downstream router's BW stage.

---

## 2. Cycle-by-Cycle Execution Loop

Because BookSim is a cycle-accurate simulator, the IQ Router processes its pipeline stages in a specific reverse-order loop during each clock cycle. Inside `_InternalStep()`:

1. **Switch Traversal**: Flits scheduled for traversal are moved across the crossbar.
2. **Switch Allocation**: SA is computed for flits waiting to cross.
3. **VC Allocation**: VA is computed for head flits waiting for downstream buffers.
4. **Routing Computation**: RC is computed for newly arrived head flits.

Evaluating the pipeline from back-to-front (ST -> SA -> VA -> RC) ensures that resources freed up by later stages (e.g., crossbar ports) can be immediately utilized by earlier stages in the same simulation cycle, accurately mimicking hardware combinatorial logic.

---

## 3. Optimizations

### Lookahead Routing
To reduce pipeline depth, some architectures compute the routing for the *next* hop while traversing the *current* hop. The IQ router supports handling lookahead routes if configured by the routing function, allowing head flits to bypass the RC stage and proceed directly to VA.
