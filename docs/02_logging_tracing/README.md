[<- Previous Page](../01_running_simulations/README.md) | [Index](../index.md)

# Logging and Tracing

BookSim provides several tools for logging and tracing network traffic and performance.

## Activity Monitoring

- `print_activity`: If set to 1, prints a detailed log of buffer reads/writes and crossbar activity at each cycle. This is useful for identifying bottlenecks.
- `viewer_trace`: Generates a trace file that can be used with external visualization tools.

## Flit and Packet Watching

You can track specific flits or packets as they move through the network.

- `watch_file`: A file containing IDs of flits/packets to watch.
- `watch_flits`, `watch_packets`: Direct specification of IDs to watch.
- `watch_out`: The file where watch information is logged.


## Example Usage

To watch a specific flit ID 1234 and output to `debug.txt`:
```
watch_flits = 1234
watch_out = debug.txt
```
To print activity for performance analysis:
```
print_activity = 1
```

## Statistics and Output Files

- [`stats_out`](stats_out.md): File where final statistics (average latency, throughput, etc.) are saved. The statistics collection and reporting logic is defined in [TrafficManager::WriteStats](../../booksim/src/trafficmanager.cpp#L1801).
- **Detailed Flow Tracking** (if compiled with `TRACK_FLOWS`):
  - [`injected_flits_out`](injected_ejected_flits.md) / [`ejected_flits_out`](injected_ejected_flits.md)
  - [`received_flits_out`](sent_received_flits.md) / [`sent_flits_out`](sent_received_flits.md)
  - [`stored_flits_out`](stored_flits.md)
  - [`outstanding_credits_out`](outstanding_credits.md)
  - [`active_packets_out`](active_packets.md)
- **Detailed Credit Tracking** (if compiled with `TRACK_CREDITS`):
  - [`used_credits_out`](used_credits_out.md) / [`free_credits_out`](free_credits_out.md) / [`max_credits_out`](max_credits_out.md)

## Statistics Logging Frequency

All detailed flow tracking and credit tracking files append a new data snapshot line periodically at regular simulation intervals.

* **Parameter**: The log update frequency is controlled by the `sample_period` parameter (defined in your BookSim configuration file, defaulting to `1000` cycles if not specified).
* **Snapshot Format**: Depending on the metric, the recorded snapshots are either **instantaneous states** at the end of the sample interval or **cumulative cycle-by-cycle counts** that are reset to zero after each write.

### Snapshot Types per File

| File Configuration | Format | Description |
| :--- | :--- | :--- |
| [`injected_flits_out`](injected_ejected_flits.md) / [`ejected_flits_out`](injected_ejected_flits.md) | **Cumulative Counts** | Total number of flits injected/ejected at terminal interfaces during the last `sample_period` cycles. Resets to `0` after writing. |
| [`received_flits_out`](sent_received_flits.md) / [`sent_flits_out`](sent_received_flits.md) | **Cumulative Counts** | Total number of flits received/sent at individual router ports during the last `sample_period` cycles. Resets to `0` after writing. |
| [`stored_flits_out`](stored_flits.md) | **Instantaneous Snapshot** | The exact number of buffered flits occupying the input virtual channel queues at the precise cycle the snapshot is taken. |
| [`outstanding_credits_out`](outstanding_credits.md) | **Instantaneous Snapshot** | Downstream credit availability tracking state at the precise snapshot cycle. |
| [`active_packets_out`](active_packets.md) | **Instantaneous Snapshot** | Instantaneous number of active packets currently residing in router input queues. |
| [`used_credits_out`](used_credits_out.md) / [`free_credits_out`](free_credits_out.md) / [`max_credits_out`](max_credits_out.md) | **Instantaneous Snapshot** | VC-level occupancy, availability, or max credit boundaries at terminal buffers and router output buffers. |

