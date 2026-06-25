[<- Logging Index](README.md) | [Index](../index.md)

# sent_flits_out / received_flits_out

`sent_flits_out` and `received_flits_out` are parameters that control where BookSim logs cycle-by-cycle flit transmission and arrival statistics for all input and output ports of every router in the network.

## How to Use

To use these features, **BookSim must be compiled with the `TRACK_FLOWS` flag enabled** (typically by adding `-DTRACK_FLOWS` to your compiler flags in the `Makefile`).

Once compiled, specify the target filenames in your configuration file:

```
sent_flits_out = sent_flits.txt
received_flits_out = received_flits.txt
```

## Output Format

When enabled, BookSim will append a single line containing comma-separated integers at every simulation cycle to the specified files.

For a network configuration with 4 terminal nodes, 4 routers with 5 ports each (inputs=5, outputs=5), 1 subnet, and 2 traffic classes, a sample output in `sent_flits.txt` or `received_flits.txt` will look like this:

```csv
0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0
0,1,0,0,0,0,0,0,0,0,2,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,0,0,0,0,0
0,2,0,1,0,0,0,0,0,0,1,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,2,1,0,0,0,0
```

## Explanation

Each line in the output file represents a single simulation cycle. The line contains comma-separated values ordered by traffic classes, subnets, and router ports.

Unlike `stored_flits_out`, **`sent_flits_out` and `received_flits_out` do NOT print dummy node queue values at the beginning of subnets.** They record router port activity directly.

The exact sequence of columns written to each line is structured as follows:

1. **For each Traffic Class $c \in \{0, \dots, \text{classes}-1\}$**:
   - **For each Subnetwork $s \in \{0, \dots, \text{subnets}-1\}$**:
     - **For each Router $r \in \{0, \dots, \text{routers}-1\}$**:
       - **Router Ports**:
         - For `received_flits_out`: $I$ integers (one per input port, representing the number of flits of class $c$ received at that input port in subnet $s$ during the current cycle).
         - For `sent_flits_out`: $O$ integers (one per output port, representing the number of flits of class $c$ transmitted from that output port in subnet $s$ during the current cycle).


Consider the following network configuration:
* `classes = 2` (Traffic Class 0 and Class 1)
* `subnets = 1`
* `routers = 4` (Routers 0 to 3)
* `inputs = 5` (Each router has 5 input ports)
* `outputs = 5` (Each router has 5 output ports)

Each line in `received_flits.txt` and `sent_flits.txt` will contain exactly $2 \times 1 \times 4 \times 5 = 40$ comma-separated columns:

| Columns | Traffic Class | Subnet | Component / Buffer Description |
| :--- | :---: | :---: | :--- |
|  1 - 5 | 0 | 0 | Router 0, Ports 0 to 4 activity |
|  6 - 10 | 0 | 0 | Router 1, Ports 0 to 4 activity |
|  11 - 15 | 0 | 0 | Router 2, Ports 0 to 4 activity |
|  16 - 20 | 0 | 0 | Router 3, Ports 0 to 4 activity |
|  21 - 25 | 1 | 0 | Router 0, Ports 0 to 4 activity |
|  26 - 30 | 1 | 0 | Router 1, Ports 0 to 4 activity |
|  31 - 35 | 1 | 0 | Router 2, Ports 0 to 4 activity |
|  36 - 40 | 1 | 0 | Router 3, Ports 0 to 4 activity |
