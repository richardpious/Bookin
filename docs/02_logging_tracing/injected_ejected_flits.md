[<- Previous Page](../01_running_simulations/README.md) | [Index](../index.md)

# injected_flits_out / ejected_flits_out

`injected_flits_out` and `ejected_flits_out` are  parameters that control where BookSim logs cycle-by-cycle flit injection and ejection counts at the terminal node boundaries.

## How to Use

To use these features, **BookSim must be compiled with the `TRACK_FLOWS` flag enabled** (typically by adding `-DTRACK_FLOWS` to your compiler flags in the `Makefile`).

Once compiled, specify the target filenames in your configuration file:

```
injected_flits_out = injected_flits.txt
ejected_flits_out = ejected_flits.txt
```

## Output Format

When enabled, BookSim will append a single line containing comma-separated integers at every simulation cycle to the specified files.

For a network configuration with 4 terminal nodes and 2 traffic classes, a sample output in `injected_flits.txt` or `ejected_flits.txt` will look like this:

```csv
0,0,0,0,0,0,0,0
0,1,0,0,0,0,0,1
1,1,0,0,0,1,0,0
```

## Explanation

Each line in the output file represents a single simulation cycle. The line contains comma-separated values ordered strictly by traffic classes and terminal nodes.

Unlike router-level stats, **`injected_flits_out` and `ejected_flits_out` track terminal-node level interfaces directly.** They do not output any router port or subnetwork structures.

The exact sequence of columns written to each line is structured as follows:

1. **For each Traffic Class $c \in \{0, \dots, \text{classes}-1\}$**:
   - **Terminal Nodes**: $N$ integers (one per terminal node, representing the number of flits of class $c$ injected or ejected at that terminal node during the current cycle).


Consider the following network configuration:
* `classes = 2` (Traffic Class 0 and Class 1)
* `nodes = 4` (Terminal Nodes 0 to 3)

Each line in `injected_flits.txt` and `ejected_flits.txt` will contain exactly $2 \times 4 = 8$ comma-separated columns:

| Columns | Traffic Class | Node / Interface Description |
| :--- | :---: | :--- |
|  1 - 4 | 0 | Terminal Nodes 0 to 3 activity |
|  5 - 8 | 1 | Terminal Nodes 0 to 3 activity |
