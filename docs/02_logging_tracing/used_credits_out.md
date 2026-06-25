[<- Logging Index](README.md) | [Index](../index.md)

# used_credits_out / free_credits_out / max_credits_out

`used_credits_out`, `free_credits_out`, and `max_credits_out` are configuration parameters that control where BookSim logs cycle-by-cycle virtual channel-level downstream buffering states. Unlike `outstanding_credits_out` (which measures port-level outstanding flits), these logging options provide more detailed virtual channel-level data.

## How to Use

To use these features, **BookSim must be compiled with the `TRACK_CREDITS` flag enabled** (typically by adding `-DTRACK_CREDITS` to your compiler flags in the `Makefile`).

Once compiled, configure the desired parameters in your configuration file:

```
used_credits_out = used_credits.txt
free_credits_out = free_credits.txt
max_credits_out  = max_credits.txt
```

## Output Format

When enabled, BookSim will append a single line containing comma-separated integers at every simulation cycle to the specified files.

For a network configuration with 4 terminal nodes, 4 routers with 5 ports each (inputs=5, outputs=5), 4 virtual channels (VCs) per port, and 1 subnet, a sample output in `used_credits.txt`, `free_credits.txt`, or `max_credits.txt` will look like this:

```csv
0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0
0,0,0,0,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,2,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0,0,0
```

## Explanation

Each line in these files represents a single simulation cycle. The line contains comma-separated values representing VC-level credit occupancy (`used`), availability (`free`), or size boundaries (`max`) ordered by subnet, terminal node VCs, and router output port VCs.

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

Each line in `used_credits.txt`, `free_credits.txt`, and `max_credits.txt` will contain exactly $1 \times ((4 \times 4) + (4 \times 5 \times 4)) = 16 + 80 = 96$ comma-separated columns:

| Columns | Subnet | Component / Buffer VC Description |
| :--- | :---: | :--- |
|  1 - 16 | 0 | Terminal nodes 0 to 3, VCs 0 to 3 credit status |
|  17 - 36 | 0 | Router 0, Output Ports 0 to 4, VCs 0 to 3 credit status |
|  37 - 56 | 0 | Router 1, Output Ports 0 to 4, VCs 0 to 3 credit status |
|  57 - 76 | 0 | Router 2, Output Ports 0 to 4, VCs 0 to 3 credit status |
|  77 - 96 | 0 | Router 3, Output Ports 0 to 4, VCs 0 to 3 credit status |
