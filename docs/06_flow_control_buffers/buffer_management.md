[<- Flow Control Index](README.md)

# Buffer Management

Buffer management defines how physical SRAM space at an input port is partitioned and allocated among Virtual Channels. BookSim handles this in the [Buffer](../../booksim/src/buffer.cpp) class.

---

## 1. Buffer Size Calculation

When a `Buffer` object is instantiated for an input port, its total size is determined by the configuration parameters.

```cpp
int num_vcs = config.GetInt("num_vcs");
_size = config.GetInt("buf_size");

if(_size < 0) {
  _size = num_vcs * config.GetInt("vc_buf_size");
}
```

- If `buf_size` is explicitly set (e.g., `buf_size = 64`), the entire port is allocated exactly 64 flit slots.
- If `buf_size` is not set (defaults to -1), the port size is implicitly calculated as the number of VCs multiplied by the buffer size per VC.

## 2. Buffer Sharing Policies

BookSim supports different policies for how the `_size` total slots are shared among the `_vc` structures.

### 2.1 Private Buffers (`buffer_policy = private`)
- **Mechanism**: Every VC is allocated a fixed, strict subset of the total buffer space, equal to `vc_buf_size`. 
- **Advantage**: Simplicity. A VC can never consume space allocated to another VC, ensuring strict isolation and preventing a single congested flow from starving others of buffer space.
- **Disadvantage**: Inefficiency. If VC 0 is full and VC 1 is empty, the physical space allocated to VC 1 is wasted.

### 2.2 Shared Buffers (`buffer_policy = shared`)
- **Mechanism**: All VCs draw from a common pool of `buf_size` slots. 
- **Advantage**: High utilization. A single VC can temporarily use more than its "fair share" of buffer space if other VCs are idle.
- **Disadvantage**: Requires strict fairness mechanisms to prevent buffer hogging (where one VC consumes the entire shared pool, deadlocking or starving other VCs).

## 3. Buffer Overflow Protection

The `Buffer::AddFlit` method strictly tracks occupancy.
```cpp
void Buffer::AddFlit( int vc, Flit *f ) {
  if(_occupancy >= _size) {
    Error("Flit buffer overflow.");
  }
  ++_occupancy;
  _vc[vc]->AddFlit(f);
}
```
If credit flow control is configured correctly, a buffer overflow should never occur. An overflow error indicates a mismatch between the configured `credit_delay` and the actual wire latency, or a bug in the routing/allocation logic.
