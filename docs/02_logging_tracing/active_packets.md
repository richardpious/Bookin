[<- Previous Page](../01_running_simulations/README.md) | [Index](../index.md)

# active_packets_out

`active_packets_out` is a configuration parameter that controls where BookSim logs cycle-by-cycle tracking of the instantaneous count of active packets residing in each router's input queues.

## How to Use

To use this feature, **BookSim must be compiled with the `TRACK_FLOWS` flag enabled** (typically by adding `-DTRACK_FLOWS` to your compiler flags in the `Makefile`).

Once compiled, specify the target filename in your configuration file:

```
active_packets_out = active_packets.txt
```

## Output Format

When enabled, BookSim will append a single line containing comma-separated integers at every simulation cycle to the specified file.

For a network configuration with 4 terminal nodes, 4 routers with 5 ports each (inputs=5, outputs=5), 1 subnet, and 2 traffic classes, a sample output in `active_packets.txt` will look like this:

```csv
0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0
0,1,0,0,0,0,0,0,0,0,2,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,0,0,0,0,0
0,2,0,0,0,0,0,0,0,0,1,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,2,1,0,0,0,0
```

## Explanation

Each line in the output file represents a single simulation cycle. The line contains comma-separated values ordered by traffic classes, subnets, and router ports.

Unlike `stored_flits_out`, **`active_packets_out` does NOT print dummy node queue values at the beginning of subnets.** It records router input port active packet counts directly.

The exact sequence of columns written to each line is structured as follows:

1. **For each Traffic Class $c \in \{0, \dots, \text{classes}-1\}$**:
   - **For each Subnetwork $s \in \{0, \dots, \text{subnets}-1\}$**:
     - **For each Router $r \in \{0, \dots, \text{routers}-1\}$**:
       - **Router Input Ports**: $I$ integers (one per input port, representing the number of currently active packets of class $c$ occupying that input queue in subnet $s$ at the end of the simulation cycle).

*Note: The active packet count is incremented by 1 when a packet's head flit enters the router buffer, and decremented by 1 when the packet's tail flit traverses the crossbar switch and exits.*


Consider the following network configuration:
* `classes = 2` (Traffic Class 0 and Class 1)
* `subnets = 1`
* `routers = 4` (Routers 0 to 3)
* `inputs = 5` (Each router has 5 input ports)

Each line in `active_packets.txt` will contain exactly $2 \times 1 \times 4 \times 5 = 40$ comma-separated columns:

| Columns | Traffic Class | Subnet | Component / Buffer Description |
| :--- | :---: | :---: | :--- |
|  1 - 5 | 0 | 0 | Router 0, Ports 0 to 4 active packet count |
|  6 - 10 | 0 | 0 | Router 1, Ports 0 to 4 active packet count |
|  11 - 15 | 0 | 0 | Router 2, Ports 0 to 4 active packet count |
|  16 - 20 | 0 | 0 | Router 3, Ports 0 to 4 active packet count |
|  21 - 25 | 1 | 0 | Router 0, Ports 0 to 4 active packet count |
|  26 - 30 | 1 | 0 | Router 1, Ports 0 to 4 active packet count |
|  31 - 35 | 1 | 0 | Router 2, Ports 0 to 4 active packet count |
|  36 - 40 | 1 | 0 | Router 3, Ports 0 to 4 active packet count |
