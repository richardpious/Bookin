[<- Power Analysis Index](README.md)

# Activity Monitors

To calculate dynamic power, the `Power_Module` needs to know exactly how many times the hardware transistors switched state. BookSim achieves this using **Activity Monitors**.

These monitors are instantiated inside the `IQRouter` and strictly tally events during the `_InternalStep()` pipeline evaluations.

---

## 1. Buffer Monitor (`buffer_monitor.cpp`)

The `BufferMonitor` tracks read and write accesses to the Virtual Channel SRAM arrays.

- **`_reads` array**: Incremented every time a flit is popped from an input VC buffer (e.g., during the Switch Traversal stage).
- **`_writes` array**: Incremented every time a flit is pushed into an input VC buffer (e.g., during the Buffer Write stage).
- **Class Granularity**: The monitor tracks these operations on a per-traffic-class basis, allowing the power module to attribute energy consumption to specific types of traffic.

*Code Example:*
```cpp
void BufferMonitor::read(int input, Flit const * f) {
  _reads[input * _classes + f->cl]++;
}
```

## 2. Switch Monitor (`switch_monitor.cpp`)

The `SwitchMonitor` tracks how many times the internal crossbar switch is traversed.

- **`_activity` array**: A multi-dimensional array (flattened) that tracks exactly which input port successfully sent a flit to which output port, and for which traffic class.
- **Trigger**: It is incremented exclusively during the Switch Traversal (ST) pipeline stage when a flit physically crosses the internal fabric.

*Code Example:*
```cpp
void SwitchMonitor::traversal(int input, int output, Flit const * f) {
  _activity[f->cl + _classes * (output + _outputs * input)]++;
}
```

## 3. Data-Dependent Power

It is important to note that BookSim's standard power model is **activity-based** but typically **not data-dependent**. 
- It counts the *number of traversals* and multiplies by an average switching factor. 
- It does not usually simulate the exact Hamming distance (bit-flips) of the actual payload data being transmitted, assuming an average toggling rate across the `channel_width` for all packets.
