[<- Previous Page](../01_running_simulations/README.md) | [Index](../index.md)

# stats_out

`stats_out` is a configuration parameter that controls where BookSim logs the final, aggregated simulation statistics. BookSim outputs these stats in a MATLAB-compatible format (using `%` for comments and standard semicolon `;` array assignments). This allows developers to directly run or load the output file as a MATLAB/Octave script to plot results or run post-processing analytics.

The files contains all the parameter values that were used to run the simulation, pulled from the input file.

## How to Use

Set `stats_out` in your BookSim configuration file to a target filename:

```
stats_out = stats.txt
```

To enable detailed pairwise (source-to-destination) latency and throughput metrics, also enable `pair_stats`:

```
pair_stats = 1
```

To include pipeline stall diagnostics in the output file, **BookSim must be compiled with the `TRACK_STALLS` flag enabled** (typically by adding `-DTRACK_STALLS` to your compiler flags in the `Makefile`).

## Output Format

When the simulation converges or completes, BookSim writes a MATLAB script like the following to `stats.txt` (representing 4 terminal nodes, 4 routers with 5 ports each, 1 subnet, and 2 traffic classes):

```matlab
%=================================
plat(1) = 15.42;
plat_hist(1,:) = 0:12 1:56 2:124 3:80 ...;
nlat(1) = 8.12;
nlat_hist(1,:) = 0:24 1:112 2:86 ...;
flat(1) = 16.10;
flat_hist(1,:) = 0:10 1:44 2:108 ...;
frag_hist(1,:) = 0:150 1:20 ...;
hops(1,:) = 1:52 2:148 3:100;
pair_sent(1,:) = [ 450 120 300 0 ... ];
pair_plat(1,:) = [ 12.1 14.3 16.5 0.0 ... ];
pair_nlat(1,:) = [ 6.5 8.2 9.4 0.0 ... ];
pair_flat(1,:) = [ 13.0 15.1 17.2 0.0 ... ];
sent_packets(1,:) = [ 0.012 0.015 0.011 0.014 ];
accepted_packets(1,:) = [ 0.012 0.015 0.011 0.014 ];
sent_flits(1,:) = [ 0.048 0.060 0.044 0.056 ];
accepted_flits(1,:) = [ 0.048 0.060 0.044 0.056 ];
sent_packet_size(1,:) = [ 4.0 4.0 4.0 4.0 ];
accepted_packet_size(1,:) = [ 4.0 4.0 4.0 4.0 ];
buffer_busy_stalls(1,:) = [ 0.002 0.001 0.003 0.001 ];
buffer_conflict_stalls(1,:) = [ 0.0001 0.0002 0.0001 0.0001 ];
buffer_full_stalls(1,:) = [ 0.004 0.003 0.005 0.002 ];
buffer_reserved_stalls(1,:) = [ 0.0 0.0 0.0 0.0 ];
crossbar_conflict_stalls(1,:) = [ 0.0015 0.0012 0.0018 0.0010 ];
```

## Explanation

Each traffic class $c$ is logged using MATLAB 1-based indexing as `c+1` (e.g., Traffic Class 0 maps to index `1`, Class 1 maps to index `2`).

### 1. Latency & Hop Count Metrics
* `plat(c+1)` - Average packet latency in cycles (includes source queuing delay, network traversal latency, and serialization latency).
* `nlat(c+1)` - Average network traversal latency in cycles (measured from the cycle the packet head flit enters the network until the tail flit is ejected, excluding source queuing time).
* `flat(c+1)` - Average individual flit latency in cycles.
* `hops(c+1, :)` - Hop count distribution, formatted as pairs of `hop_count:packet_frequency` (e.g., `2:148` means 148 packets traversed exactly 2 hops).

### 2. Detailed Latency Histograms
* `plat_hist(c+1, :)`, `nlat_hist(c+1, :)`, `flat_hist(c+1, :)` - Histograms showing cycle-by-cycle frequency distributions, formatted as space-separated pairs of `latency_cycles:frequency` (e.g., `2:124` means 124 packets had a latency of exactly 2 cycles).
* `frag_hist(c+1, :)` - Packet fragmentation histogram tracking flit gaps within packets.

### 3. Pairwise Source-to-Destination Metrics (logged only when `pair_stats = 1`)
These arrays contain flattened, space-separated matrices of size $N^2$ (where $N$ is the number of terminal nodes). The elements map to source $i$ and destination $j$ using index $i \times N + j$:
* `pair_sent(c+1, :)` - Number of successfully received packets transmitted from source node $i$ to destination $j$.
* `pair_plat(c+1, :)` - Average packet latency (cycles) from source $i$ to destination $j$.
* `pair_nlat(c+1, :)` - Average network latency (cycles) from source $i$ to destination $j$.
* `pair_flat(c+1, :)` - Average flit latency (cycles) from source $i$ to destination $j$.

### 4. Node Injection & Acceptance Rates
These space-separated arrays contain $N$ elements representing cycle averages for each individual terminal node (from index 0 to $N-1$):
* `sent_packets(c+1, :)` / `accepted_packets(c+1, :)` - Packet injection / acceptance rate per node (packets/cycle).
* `sent_flits(c+1, :)` / `accepted_flits(c+1, :)` - Flit injection / acceptance rate per node (flits/cycle).
* `sent_packet_size(c+1, :)` / `accepted_packet_size(c+1, :)` - Average packet size in flits per node.

### 5. Router Stall Statistics (logged only if compiled with `TRACK_STALLS`)
These space-separated arrays contain `subnets * routers` elements representing the cycle fraction spent stalled at each router (cycles stalled divided by measurement duration):
* `buffer_busy_stalls(c+1, :)` - Stalls due to target VCs currently being busy/allocated.
* `buffer_conflict_stalls(c+1, :)` - Stalls due to allocation contention among multiple requesting VCs.
* `buffer_full_stalls(c+1, :)` - Stalls due to target buffers having no free space.
* `buffer_reserved_stalls(c+1, :)` - Stalls waiting for reserved buffer space.
* `crossbar_conflict_stalls(c+1, :)` - Stalls due to internal crossbar switch scheduling contention.
