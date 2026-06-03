[<- Power Analysis Index](README.md)

# The Power Module

The `Power_Module` (implemented in [power_module.cpp](../../booksim/src/power/power_module.cpp)) is the central engine for estimating the energy consumption and silicon area of the simulated Network-on-Chip.

---

## 1. Integration with the Simulator

Unlike the cycle-by-cycle operational components (like `Router` or `TrafficManager`), the `Power_Module` does not actively participate in routing flits. Instead, it acts as an **observer**.

When `sim_power = 1` is set in the configuration:
1. The `TrafficManager` instantiates the `Power_Module`, passing it the constructed `Network` and the parsed `tech_file`.
2. As the simulation runs, the `Power_Module` remains idle while specialized monitors (attached to the routers) passively count hardware switching events.
3. At the end of the simulation, the `Power_Module::run()` method is called to aggregate the counts, apply the physical technology models, and output the final statistics.

## 2. Power and Area Calculations

The module breaks down the power consumption and area footprint into four major structural categories.

### 2.1 Channels (Links)
Calculates power based on the length of the physical wires connecting routers.
- **Dynamic Power**: `channelWirePower` (switching data bits), `channelClkPower` (clock trees), `channelDFFPower` (retiming flip-flops).
- **Static Power**: `channelLeakPower` (leakage current through repeaters).
- **Optimization**: The module includes an internal `wireOptimize()` function to determine the optimal repeater spacing and sizing (`K`, `M`, `N`) based on the given wire length to minimize delay and power.

### 2.2 Input Buffers (Memory)
Models the SRAM arrays used for Virtual Channel buffers.
- **Dynamic Power**: `inputReadPower`, `inputWritePower`. Calculated based on wordline (`powerWordLine`) and bitline (`powerMemoryBitRead`, `powerMemoryBitWrite`) switching capacitance.
- **Static Power**: `inputLeakagePower`.

### 2.3 Crossbar Switch
Models the internal `NxM` routing fabric.
- **Dynamic Power**: `switchPower` (datapath traversal), `switchPowerCtrl` (crossbar control signals).
- **Static Power**: `switchPowerLeak`.
- **Mechanics**: Computes the capacitive load of driving the row and column wires of the crossbar matrix.

### 2.4 Output Modules
Models the egress latches and D-Flip-Flops at the output ports.
- **Dynamic Power**: `outputPower` (DFF switching), `outputPowerClk` (local clock), `outputCtrlPower`.

## 3. The Output Summary

When the simulation completes, the module prints a comprehensive breakdown to standard output (and to `power_output_file` if configured), separating Dynamic and Leakage power for every component, followed by a physical Area summary in square micrometers ($\mu m^2$).
