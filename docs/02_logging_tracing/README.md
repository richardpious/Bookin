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


