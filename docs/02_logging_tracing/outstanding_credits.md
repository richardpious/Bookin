[<- Logging Index](README.md) | [Index](../index.md)

# outstanding_credits_out

`outstanding_credits_out` is a configuration parameter that controls where BookSim logs cycle-by-cycle tracking of outstanding credits (downstream buffering allocations) at each terminal node injection interface and router output port.

## How to Use

To use this feature, **BookSim must be compiled with the `TRACK_FLOWS` flag enabled** (typically by adding `-DTRACK_FLOWS` to your compiler flags in the `Makefile`).

Once compiled, specify the target filename in your configuration file:

```
outstanding_credits_out = outstanding_credits.txt
```

## Output Format

When enabled, BookSim will append a single line containing comma-separated integers at every simulation cycle to the specified file.

For a network configuration with 4 terminal nodes, 4 routers with 5 ports each (inputs=5, outputs=5), 1 subnet, and 2 traffic classes, a sample output in `outstanding_credits.txt` will look like this:

```csv
0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0
0,0,0,0,0,1,0,0,0,0,0,0,0,0,2,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0,0,0
0,0,0,0,0,2,0,0,1,0,0,1,0,0,1,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,2,1,0,0,0,0,0,0,0,0
```

## Explanation

Each line in the output file represents a single simulation cycle. The line contains comma-separated values ordered by traffic classes, subnets, terminal interface credits, and router output ports.

Unlike `sent_flits_out` or `received_flits_out`, **`outstanding_credits_out` includes terminal injection credits** at the beginning of each subnetwork representation.

The exact sequence of columns written to each line is structured as follows:

1. **For each Traffic Class $c \in \{0, \dots, \text{classes}-1\}$**:
   - **For each Subnetwork $s \in \{0, \dots, \text{subnets}-1\}$**:
     - **Node Injection Credits**: $N$ integers (one per terminal node, representing the number of outstanding credits at the injection interface for Class $c$ in subnet $s$).
     - **Router Output Credits**: For each router $r \in \{0, \dots, \text{routers}-1\}$, $O$ integers (one per output port, representing the number of outstanding credits—flits sent downstream that have not received credit back—for Class $c$ in subnet $s$).


Consider the following network configuration:
* `classes = 2` (Traffic Class 0 and Class 1)
* `subnets = 1`
* `nodes = 4` (Terminal Nodes 0 to 3)
* `routers = 4` (Routers 0 to 3)
* `outputs = 5` (Each router has 5 output ports)

Each line in `outstanding_credits.txt` will contain exactly $2 \times 1 \times (4 + (4 \times 5)) = 48$ comma-separated columns:

| Columns | Traffic Class | Subnet | Component / Credit Description |
| :--- | :---: | :---: | :--- |
|  1 - 4 | 0 | 0 | Terminal nodes 0 to 3 outstanding injection credits |
|  5 - 9 | 0 | 0 | Router 0, Output Ports 0 to 4 outstanding credits |
|  10 - 14 | 0 | 0 | Router 1, Output Ports 0 to 4 outstanding credits |
|  15 - 19 | 0 | 0 | Router 2, Output Ports 0 to 4 outstanding credits |
|  20 - 24 | 0 | 0 | Router 3, Output Ports 0 to 4 outstanding credits |
|  25 - 28 | 1 | 0 | Terminal nodes 0 to 3 outstanding injection credits |
|  29 - 33 | 1 | 0 | Router 0, Output Ports 0 to 4 outstanding credits |
|  34 - 38 | 1 | 0 | Router 1, Output Ports 0 to 4 outstanding credits |
|  39 - 43 | 1 | 0 | Router 2, Output Ports 0 to 4 outstanding credits |
|  44 - 48 | 1 | 0 | Router 3, Output Ports 0 to 4 outstanding credits |
