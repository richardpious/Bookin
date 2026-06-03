[<- Previous Page](../01_running_simulations/README.md) | [Index](../index.md)

# Power Analysis

BookSim includes a power model that estimates the power and area consumption of the network based on the technology parameters and the activity recorded during simulation. The power analysis is orchestrated by the [PowerModule](../../booksim/src/power/power_module.cpp#L34).


To explore the power and area models in depth, please refer to the following guides:
- [The Power Module](power_module.md): Integration with the simulator and calculation of dynamic/leakage power for channels, buffers, and crossbars.
- [Activity Monitors](activity_monitors.md): How `BufferMonitor` and `SwitchMonitor` passively track hardware switching events.
- [Technology Parameters](technology_parameters.md): Breakdown of the required physical constants (Vdd, capacitance, leakage, device sizing) in the `tech_file`.

## Enabling Power Analysis

To enable power analysis, set the `sim_power` parameter to 1. You also need to provide a technology file that specifies the physical characteristics of the target hardware.

| Parameter | Description | Default |
|-----------|-------------|---------|
| `sim_power` | Enables power modeling. | 0 |
| `tech_file` | Path to the technology configuration file. | (required if sim_power=1) |
| `power_output_file` | File where power results are saved. | `pwr_tmp` |
| `channel_width` | Width of the physical links in bits. | 128 |

## Technology Parameters

The technology file (specified by `tech_file`) contains low-level hardware parameters such as:
- **Voltage (`Vdd`)**: Operating voltage.
- **Transistor Leakage (`IoffSRAM`, `IoffP`, `IoffN`)**: Off-state current.
- **Capacitance (`Cg`, `Cd`, `Cw_gnd`, `Cw_cpl`)**: Gate, drain, and wire capacitance.
- **Resistance (`Rw`)**: Wire resistance per unit length.
- **Metal Pitch**: Spacing between metal wires.

## Power Categories

The results are typically categorized into:
1. **Dynamic Power**: Energy consumed during switching activity (buffer writes, crossbar traversals, link transfers).
2. **Leakage Power**: Static power consumed by the hardware components regardless of activity.
3. **Area**: Estimated physical footprint of the routers and links.

## Usage Example

```
sim_power = 1
tech_file = 45nm_tech.txt
channel_width = 128
power_output_file = results/power_stats.txt
```
The technology parameters are often defined in the `src/power/` directory or provided as external configuration files.
