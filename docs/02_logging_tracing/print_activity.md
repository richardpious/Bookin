[<- Logging Index](README.md) | [Index](../index.md)

# print_activity

`print_activity` is a boolean parameter that controls whether the simulation prints detailed activity information about the number of read/writes to each port and crossbar switch to the console at each simulation step.

## How to Use

Set `print_activity` to `1` in your BookSim input file to enable detailed activity tracing:

```
print_activity = 1
```

## Output Format

When `print_activity` is enabled, BookSim will print the following information for each router at every simulation cycle:

```
router_0_0.bufferMonitor:
[ 0 ] Type=0:(R#1145,W#1145) Type=1:(R#760,W#760) 
[ 1 ] Type=0:(R#0,W#0) Type=1:(R#0,W#0) 
[ 2 ] Type=0:(R#1085,W#1085) Type=1:(R#776,W#776) 
[ 3 ] Type=0:(R#0,W#0) Type=1:(R#0,W#0) 
[ 4 ] Type=0:(R#1710,W#1710) Type=1:(R#1216,W#1216) 

router_0_0.switchMonitor:
Inputs=5Outputs=5[0 -> 0] 0:0 1:0 
[0 -> 1] 0:0 1:0 
[0 -> 2] 0:410 1:264 
[0 -> 3] 0:0 1:0 
[0 -> 4] 0:735 1:496 
[1 -> 0] 0:0 1:0 
[1 -> 1] 0:0 1:0 
[1 -> 2] 0:0 1:0 
[1 -> 3] 0:0 1:0 
[1 -> 4] 0:0 1:0 
[2 -> 0] 0:380 1:224 
[2 -> 1] 0:0 1:0 
[2 -> 2] 0:0 1:0 
[2 -> 3] 0:0 1:0 
[2 -> 4] 0:705 1:552 
[3 -> 0] 0:0 1:0 
[3 -> 1] 0:0 1:0 
[3 -> 2] 0:0 1:0 
[3 -> 3] 0:0 1:0 
[3 -> 4] 0:0 1:0 
[4 -> 0] 0:715 1:592 
[4 -> 1] 0:0 1:0 
[4 -> 2] 0:845 1:488 
[4 -> 3] 0:0 1:0 
[4 -> 4] 0:150 1:136 

```

Where:
- `router_0_0.bufferMonitor:` -  the buffer monitor associated with router 0,0
- `[ 0 ]` - the input port number
- `Type=0:(R#1145,W#1145)` - Type=0 represents the 0th traffic class. `R#1145` is the number of reads from the input buffer and `W#1145` is the number of writes to the output buffer.
- `router_0_0.switchMonitor:` - the crossbar switch monitor associated with router 0,0
- `Inputs=5Outputs=5` - the number of input and output ports
- `[0 -> 0]` - the crossbar switch connecting input port number 0 to output port number 0
- `0:0 1:0` - the number of traversals from the input port to the output port for each traffic class (Type 0 and Type 1)