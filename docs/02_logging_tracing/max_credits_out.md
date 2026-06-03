[<- Previous Page](../01_running_simulations/README.md) | [Index](../index.md)

# max_credits_out

`max_credits_out` is a configuration parameter that controls where BookSim logs cycle-by-cycle virtual channel-level downstream buffering states.

## How to Use

To use this feature, **BookSim must be compiled with the `TRACK_CREDITS` flag enabled** (typically by adding `-DTRACK_CREDITS` to your compiler flags in the `Makefile`).

Once compiled, specify the target filename in your configuration file:

```
max_credits_out = max_credits.txt
```

## Output Format

When enabled, BookSim will append a single line containing comma-separated integers at every simulation cycle to the specified file.

For a network configuration with 4 terminal nodes, 4 routers with 5 ports each (inputs=5, outputs=5), 4 virtual channels (VCs) per port, and 1 subnet, a sample output in `max_credits.txt` will look like this (representing maximum buffer limits configured per VC, which typically remain constant):

```csv
4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4
4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4
```

## Explanation

Each line in the output file represents a single simulation cycle. The line contains comma-separated values representing VC-level capacity limits (`max`) ordered by subnet, terminal node VCs, and router output port VCs.

The exact sequence of columns written to each line is structured as follows:

1. **For each Subnetwork $s$**:
   - **Terminal Injection VC Buffers** (Total columns: $\text{nodes} \times \text{vcs}$):
     - Ordered by Node: **Node 0** (VCs $0 \dots V-1$), **Node 1** (VCs $0 \dots V-1$), $\dots$, **Node $N-1$** (VCs $0 \dots V-1$).
   - **Router Output VC Buffers** (Total columns: $\text{routers} \times \text{outputs} \times \text{vcs}$):
     - Ordered by Router: **Router 0**, then **Router 1**, $\dots$, up to **Router $R-1$**.
     - Within each router, ordered by output ports: **Port 0** (VCs $0 \dots V-1$), **Port 1** (VCs $0 \dots V-1$), $\dots$, up to **Port $O-1$** (VCs $0 \dots V-1$).


Consider the following network configuration:
* `subnets = 1`
* `nodes = 4` (Terminal Nodes 0 to 3)
* `routers = 4` (Routers 0 to 3)
* `outputs = 5` (Each router has 5 output ports)
* `num_vcs = 4` (4 VCs per port)

Each line in `max_credits.txt` will contain exactly $1 \times ((4 \times 4) + (4 \times 5 \times 4)) = 16 + 80 = 96$ comma-separated columns:

| Columns | Subnet | Component / Buffer VC Description |
| :--- | :---: | :--- |
|  1 - 16 | 0 | Terminal nodes 0 to 3, VCs 0 to 3 credit status |
|  17 - 36 | 0 | Router 0, Output Ports 0 to 4, VCs 0 to 3 credit status |
|  37 - 56 | 0 | Router 1, Output Ports 0 to 4, VCs 0 to 3 credit status |
|  57 - 76 | 0 | Router 2, Output Ports 0 to 4, VCs 0 to 3 credit status |
|  77 - 96 | 0 | Router 3, Output Ports 0 to 4, VCs 0 to 3 credit status |
