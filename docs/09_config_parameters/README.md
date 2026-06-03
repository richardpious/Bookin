[<- Previous Page](../08_power_analysis/README.md) | [Index](../index.md)

# Configuration Parameters

This page provides a consolidated list of the most commonly used configuration parameters in BookSim.
## Detailed Documentation

To explore the configuration parsing engine in depth, please refer to the following guides:
- [Configuration Parser](configuration_parser.md): Lex/Yacc mechanics for reading configuration text files.
- [The BookSimConfig Class](booksim_config.md): Default values, strict typing, and command-line overrides.

## General Simulation

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `sim_type` | string | `latency` | Type of simulation (`latency`, `throughput`). |
| `sim_count` | int | 1 | Number of simulations to perform. |
| `seed` | int | 0 | Random seed for simulation. |
| `sample_period`| int | 1000 | Duration of each measurement period in cycles. |
| `warmup_periods`| int | 3 | Number of periods to discard for warmup. |
| `max_samples` | int | 10 | Maximum number of sample periods. |
| `latency_thres` | float | 500.0 | Stability threshold (assumed unstable if avg latency exceeds this). |
| `warmup_thres` | float | 0.05 | Convergence threshold for warmup. |
| `stopping_thres` | float | 0.05 | Convergence threshold for stopping. |
| `include_queuing`| int | 1 | Include source queuing latency in statistics. |

## Network and Topology

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `topology` | string | `torus` | Topology name (e.g., `mesh`, `torus`, `fattree`). |
| `k` | int | 8 | Radix (nodes per dimension). |
| `n` | int | 2 | Number of dimensions. |
| `c` | int | 1 | Concentration (nodes per router). |
| `routing_function` | string | `none` | Routing algorithm name. |
| `subnets` | int | 1 | Number of physical sub-networks. |
| `use_noc_latency` | int | 1 | Adjust latency for node/router placement. |
| `x`, `y` | int | 8 | Number of routers in X and Y dimensions. |
| `xr`, `yr` | int | 1 | Nodes per router in X and Y (if concentration > 1). |
| `channel_file` | string | "" | File listing physical channel lengths. |
| `network_file` | string | "" | File defining arbitrary network topology (`anynet`). |

## Router Architecture

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `router` | string | `iq` | Router model (default is Input-Queued). |
| `num_vcs` | int | 16 | Number of virtual channels per physical port. |
| `vc_buf_size` | int | 8 | Flits per VC buffer (for `private` policy). |
| `buf_size` | int | -1 | Total shared buffer size (if `buffer_policy` is `shared`). |
| `buffer_policy` | string | `private` | Buffer sharing policy (`private`, `shared`). |
| `vc_allocator` | string | `islip` | VC allocator type (e.g., `islip`, `pim`). |
| `sw_allocator` | string | `islip` | Switch allocator type. |
| `alloc_iters` | int | 1 | Number of iterations for allocators. |
| `internal_speedup`| float | 1.0 | Internal crossbar speedup factor. |
| `input_speedup` | int | 1 | Input port expansion factor. |
| `output_speedup` | int | 1 | Output port expansion factor. |
| `routing_delay` | int | 1 | Pipeline stages for routing. |
| `vc_alloc_delay` | int | 1 | Pipeline stages for VC allocation. |
| `sw_alloc_delay` | int | 1 | Pipeline stages for switch allocation. |
| `st_final_delay` | int | 1 | Cycles for switch traversal and link traversal. |
| `speculative` | int | 0 | Enable speculative switch allocation. |
| `noq` | int | 0 | Enable next-hop-output queueing. |
| `vc_priority_donation`| int | 0 | Allow high-priority flits to donate priority. |
| `hold_switch_for_packet`| int | 0 | Hold switch configuration for the entire packet. |

## Traffic and Injection

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `traffic` | string | `uniform` | Traffic pattern (e.g., `uniform`, `bitcomp`, `tornado`). |
| `injection_rate` | float | 0.1 | Injection rate (packets/node/cycle). |
| `injection_process`| string | `bernoulli` | Injection process model (`bernoulli`, `on_off`). |
| `packet_size` | int | 1 | Default packet size in flits. |
| `burst_alpha` | float | 0.5 | Probability of switching from OFF to ON (bursty). |
| `burst_beta` | float | 0.5 | Probability of switching from ON to OFF (bursty). |
| `priority` | string | `none` | Message priority scheme. |
| `use_read_write` | int | 0 | Enable read/write request/reply simulation. |
| `read_request_size`| int | 1 | Packet size for read requests. |
| `write_reply_size` | int | 1 | Packet size for write replies (data). |
| `read_request_begin_vc`| int | 0 | Start VC for read requests. |
| `read_request_end_vc`| int | 5 | End VC for read requests. |

## Logging and Debugging

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `print_activity` | int | 0 | Print detailed router and channel activity. |
| `print_csv_results`| int | 0 | Output summary results in CSV format. |
| `deadlock_warn_timeout`| int | 256 | Cycles a flit can be stalled before a warning. |
| `stats_out` | string | "" | File to write detailed statistics. |
| `watch_out` | string | "" | File to write watched flit information. |
| `watch_flits` | string | "" | Comma-separated list of flit IDs to track. |
| `watch_packets` | string | "" | Comma-separated list of packet IDs to track. |
| `injected_flits_out`| string | "" | Output file for injected flits (requires `TRACK_FLOWS`). |
| `received_flits_out`| string | "" | Output file for received flits (requires `TRACK_FLOWS`). |
| `stored_flits_out` | string | "" | Output file for stored flits (requires `TRACK_FLOWS`). |
| `sent_flits_out` | string | "" | Output file for sent flits (requires `TRACK_FLOWS`). |
| `outstanding_credits_out`| string | "" | Output file for outstanding credits (requires `TRACK_FLOWS`). |
| `used_credits_out` | string | "" | Output file for used credits (requires `TRACK_CREDITS`). |
| `free_credits_out` | string | "" | Output file for free credits (requires `TRACK_CREDITS`). |

## Power Analysis

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `sim_power` | int | 0 | Enable power simulation model. |
| `tech_file` | string | "" | Path to the technology parameters file. |
| `channel_width` | int | 128 | Width of the physical links in bits. |
| `power_output_file`| string | `pwr_tmp` | File to save power analysis results. |

---
*For a complete list of all parameters and their default values, refer to the [BookSimConfig](../../booksim/src/booksim_config.cpp#L38) file.*
