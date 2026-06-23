[<- Index](../)

# Running Simulations

BookSim is executed via the command line and configured using structured configuration files. This guide details how to build and execute BookSim, configure simulation control parameters, and adjust timing phases for statistics collection.

---

## Compiling BookSim

BookSim must be compiled before running simulations. The compilation source files and the `Makefile` are located in the `booksim/src` directory.

### 1. Compiling the Simulator
To navigate to the source directory and compile BookSim using the default configuration:
```bash
cd booksim/src
make
```
To speed up the compilation process substantially on multi-core systems, use the `-j` parameter to compile files in parallel. You can specify the number of concurrent jobs, or dynamically allocate all available CPU cores:
```bash
# Compile using 4 parallel jobs
make -j4

# Compile using all available CPU cores automatically
make -j$(nproc)
```

### 2. Cleaning Build Artifacts
If you modify header files, change preprocessor flags, or need a fresh build, clean the previous compilation files (including object files `.o`, dependency files `.d`, lexer/parser sources, and the final binary):
```bash
# Clean compiled binaries and intermediate object files
make clean

# Distclean (cleans object files, dependencies, and swap/backup files)
make distclean
```

### 3. Compilation Flag Customization
Inside the `Makefile`, the `DEFINE` variable determines which tracking features are compiled into BookSim:
```makefile
DEFINE = -DTRACK_CREDITS -DTRACK_FLOWS -DTRACK_STALLS
```
* **`-DTRACK_FLOWS`**: Required for logging detailed flow files like `injected_flits_out`, `received_flits_out`, and `active_packets_out`.
* **`-DTRACK_CREDITS`**: Required for high-resolution VC-level tracking like `used_credits_out`, `free_credits_out`, and `max_credits_out`.

---

## Running BookSim


Once BookSim is compiled (via `make`), the simulator can be executed directly from the terminal.

### 1. Basic Execution
To run a simulation using a single configuration file:
```bash
./booksim [config_file]
```
*Example:*
```bash
./booksim configs/mesh88_config
```

### 2. Overriding Parameters via Command Line
You can dynamically override any configuration parameter defined in the config file at runtime by passing `parameter=value` pairs as arguments. Overrides must **not** contain spaces around the `=` operator.

```bash
./booksim [config_file] [parameter=value] [parameter=value] ...
```
*Example:*
```bash
./booksim configs/mesh88_config injection_rate=0.015 traffic=uniform
```

### 3. Multiple Configuration Files
If multiple configuration files are passed, they are processed in order from left to right. Settings in later files will overwrite any overlapping configurations defined in earlier files.

```bash
./booksim base_config topology_config traffic_config
```

---

## Simulation Types (`sim_type`)

BookSim supports three main execution modes configured via the `sim_type` parameter:

* **Latency (`latency`)** *(Default)*: Measures average packet latency for a fixed flit injection rate. The simulation runs dynamically until the average latency has converged (stable state).
* **Throughput (`throughput`)**: Used to profile the maximum sustained throughput. It automatically ramps up the injection rate to determine the saturation point.
* **Batch (`batch`)**: Instead of continuous streaming traffic, a fixed number of packets are injected, and the simulation measures the total execution time (draining time) required to deliver the batch.

---

## Simulation Control Parameters

Adjust these options in your configuration file (or command line) to control seed generation, run count, and instability threshold rules:

| Parameter | Type | Default | Description |
| :--- | :---: | :---: | :--- |
| `sim_type` | string | `latency` | The simulation mode: `latency`, `throughput`, or `batch`. |
| `sim_count` | int | `1` | Number of completely independent simulation runs to perform. |
| `seed` | int/str | `0` | Random seed for reproducibility. Use `"time"` for a real random seed based on the system clock. |
| `latency_thres` | float | `500.0` | Instability threshold. If average latency exceeds this number, the network is considered saturated/deadlocked, and BookSim halts. |
| `include_queuing` | int | `1` | Set to `1` to include source queue buffering delay in the total packet latency; set to `0` to exclude it. |
| `print_activity` | int | `0` | Set to `1` to output detailed cycle-by-cycle buffer reads/writes and crossbar switch traversals. |
| `print_csv_results` | int | `0` | Set to `1` to output a clean, comma-separated summary of final simulation results at completion. |

---

## Simulation Phases (Continuous Flow Mode)

Continuous flow simulations (e.g., `sim_type = latency`) execute in consecutive **sample periods** (intervals measured in cycles) divided into two major phases:

```
[--- Warmup Phase ---] -> [------------ Measurement Phase ------------]
(Discarded Samples)       (Sample 1 -> Sample 2 -> ... -> Convergence)
```

### 1. Warmup Phase
The warmup phase allows the network to reach a steady state (thermal equilibrium) before statistics are collected.
* **`warmup_periods`**: The minimum number of sample periods to discard before starting measurements. (Default: `0`)
* **`warmup_thres`**: Warmup convergence criteria. The warmup phase ends when the relative change in average latency between successive sample periods is smaller than this threshold. (Default: `0.05` / `5%`)

### 2. Measurement Phase
Once warmed up, BookSim resets its statistics and enters the measurement phase. The simulation runs in intervals of `sample_period` cycles.
* **`sample_period`**: The duration of each measurement interval in simulation cycles. (Default: `1000`)
* **`max_samples`**: The absolute maximum number of sample periods to collect. If this is reached without converging, the simulation exits. (Default: `10`)
* **`stopping_thres`**: Measurement convergence criteria. The simulation terminates successfully once the relative change in latency between successive measurement periods falls below this value. (Default: `0.05` / `5%`)

---

## Batch Mode Parameters

When `sim_type = batch` is configured, BookSim ignores sample-period convergence and instead injects a precise batch of packets:

| Parameter | Type | Default | Description |
| :--- | :---: | :---: | :--- |
| `batch_size` | int | `1000` | Number of packets injected per terminal node in each batch. |
| `batch_count` | int | `1` | Total number of consecutive batches to run. |
| `sent_packets_out` | string | `""` | Filename to write packet injection sequence numbers for debugging. |
