[<- Previous Page](../01_running_simulations/README.md) | [Index](../index.md)

# stored_flits_out

`stored_flits_out` is a configuration parameter that controls where BookSim logs detailed cycle-by-cycle buffer occupancy statistics for all input queues of every router in the network. This is extremely useful for offline queue occupancy analysis, buffer allocation studies, and identifying localized structural congestion.

## How to Use

To use this feature, **BookSim must be compiled with the `TRACK_FLOWS` flag enabled** (typically by adding `-DTRACK_FLOWS` to your compiler flags in the `Makefile`). 

Once compiled, specify a filename in your configuration file to begin logging:

```
stored_flits_out = stored_flits.txt
```

## Output Format

When enabled, BookSim will append a single line containing comma-separated integers at every simulation cycle to the specified file. 

For a small network configuration (e.g., 4 nodes, 4 routers with 5 ports each, 1 subnet, and 2 traffic classes), a sample output in `stored_flits.txt` will look like this:

```csv
0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0
0,0,0,0,0,1,0,0,0,0,0,0,0,0,2,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0,0,0
0,0,0,0,0,2,0,0,0,0,0,1,0,0,1,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,2,1,0,0,0,0,0,0,0,0
```

## Explanation

Each line in the output file represents a single simulation cycle. The line contains comma-separated values ordered by traffic classes, subnets, node queues, and router input ports. 

The exact sequence of columns written to each line is structured as follows:

1. **For each Traffic Class $c \in \{0, \dots, \text{classes}-1\}$**:
   - **For each Subnetwork $s \in \{0, \dots, \text{subnets}-1\}$**:
     - **Node Injection Queues**: $N$ integers (one per terminal node; typically all `0` since terminal injection queues are tracked separately).
     - **Router Input Buffers**: For each router $r \in \{0, \dots, \text{routers}-1\}$, $I$ integers (one per input port, representing the number of currently stored flits of class $c$ in subnet $s$ at that input port).

Consider the following network configuration:
* `classes = 2` (Traffic Class 0 and Class 1)
* `subnets = 1`
* `nodes = 4` (Terminal Nodes 0 to 3)
* `routers = 4` (Routers 0 to 3)
* `inputs = 5` (Each router has 5 input ports, e.g., North, South, East, West, and Local injection)

Each line in the file will contain exactly $2 \times 1 \times (4 + (4 \times 5)) = 48$ comma-separated columns:

| Columns | Traffic Class | Subnet | Component / Buffer Description |
| :--- | :---: | :---: | :--- |
|  1 - 4 | 0 | 0 | Dummy terminal injection queues (always `0`) |
|  5 - 9 | 0 | 0 | Router 0, Input Ports 0 to 4 occupancy |
|  10 - 14 | 0 | 0 | Router 1, Input Ports 0 to 4 occupancy |
|  15 - 19 | 0 | 0 | Router 2, Input Ports 0 to 4 occupancy |
|  20 - 24 | 0 | 0 | Router 3, Input Ports 0 to 4 occupancy |
|  25 - 28 | 1 | 0 | Dummy terminal injection queues (always `0`) |
|  29 - 33 | 1 | 0 | Router 0, Input Ports 0 to 4 occupancy |
|  34 - 38 | 1 | 0 | Router 1, Input Ports 0 to 4 occupancy |
|  39 - 43 | 1 | 0 | Router 2, Input Ports 0 to 4 occupancy |
|  44 - 48 | 1 | 0 | Router 3, Input Ports 0 to 4 occupancy |
