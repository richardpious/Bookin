[<- Power Analysis Index](README.md)

# Technology Parameters (`tech_file`)

The `Power_Module` calculates energy and area based on physical constants derived from standard semiconductor manufacturing processes (e.g., 45nm, 32nm). These constants must be provided via the `tech_file` configuration parameter.

---

## 1. Format of the Tech File

The technology file uses the same key-value syntax as the main BookSim configuration file. 
```text
Vdd = 1.0;
MetalPitch = 0.00014; // in mm
LAMBDA = 0.0225; // in um
```

## 2. Key Parameter Categories

The `Power_Module` expects the following low-level physical parameters to exist in the `tech_file`.

### 2.1 Voltage and Scaling
- **`Vdd`**: The operating voltage of the chip (e.g., 1.0V). Dynamic power scales heavily with $V_{dd}^2$.
- **`LAMBDA`**: The feature size scaler (in $\mu m$), often equal to half the minimum feature size (e.g., for a 45nm process, $\lambda = 0.0225 \mu m$).

### 2.2 Capacitance [F / $\mu m$]
Capacitance determines the energy required to switch a transistor or drive a wire.
- **`Cg`, `Cd`, `Cgdl`**: Gate, drain, and overlap capacitance (used for calculating logic gate delays).
- **`Cg_pwr`, `Cd_pwr`**: Gate and drain capacitance specifically calibrated for power calculations.
- **`Cw_cpl`, `Cw_gnd`**: Wire coupling (left/right) and wire-to-ground (up/down) capacitance per millimeter.

### 2.3 Leakage Current [A / $\mu m$]
Leakage determines the static power consumed even when the router is completely idle.
- **`IoffN`, `IoffP`**: Off-state leakage current for NMOS and PMOS transistors.
- **`IoffSRAM`**: Leakage current specifically from the bitlines of the SRAM cells used in Virtual Channel buffers.

### 2.4 Device Sizing
The physical size of standard cell gates affects both their delay (drive strength) and their area footprint.
- **`H_INVD2`, `W_INVD2`**: Height and width of a standard drive-strength-2 Inverter.
- **`H_DFQD1`, `W_DFQD1`**: Height and width of a D-Flip-Flop.
- **`H_SRAM`, `W_SRAM`**: Height and width of an SRAM memory cell.

### 2.5 Wire Characteristics
- **`Rw`**: Wire resistance per unit length.
- **`MetalPitch`**: Minimum spacing between metal wires, determining the physical density of the crossbar and link channels.
- **`wire_length`**: The baseline physical length of a network channel in millimeters.
