[<- Routing Index](README.md)

# Adaptive Routing

Adaptive routing algorithms dynamically select paths based on the current network state, such as buffer occupancy or link congestion, allowing the network to balance load and avoid hotspots.

---

## 1. Minimal Adaptive Routing (`min_adapt_mesh`)

Minimal adaptive routing evaluates all possible output ports that move the packet closer to its destination (minimal paths) and selects the one with the least congestion.

- **Congestion Metric**: BookSim typically evaluates congestion using available credits (representing free downstream buffer space).
- **Selection Logic**: The router polls the `GetUsedCredit(out_port)` for all valid minimal output ports and selects the port with the lowest used credit count (i.e., the most available space).

## 2. Turn-Model Routing

Turn models restrict certain turns in the network graph to prevent cyclic dependencies while still offering adaptive path diversity.

### 2.1 West-First (`west_first_mesh`)
- **Rule**: Route west first, if necessary. Once a packet turns away from the west direction (e.g., turns north or south), it is prohibited from ever turning west again.
- **Adaptivity**: Packets can adaptively route east, north, or south, but must fulfill all west-bound travel immediately.

### 2.2 North-Last (`north_last_mesh`)
- **Rule**: Packets can adaptively route in any direction, but once they route north, they cannot turn to any other direction.
- **Adaptivity**: Highly adaptive until the final northern segment of the journey.

### 2.3 Negative-First (`negative_first_mesh`)
- **Rule**: Packets must complete routing in the negative directions (-X, -Y) before taking any positive directions (+X, +Y).

## 3. Adaptive XY/YX (`adaptive_xy_yx_mesh`)

This function dynamically chooses between the `XY` path and the `YX` path at the source router, rather than choosing randomly.

- **Evaluation**: The source router evaluates the congestion on the outgoing X port and the outgoing Y port.
- **Selection**: 
```cpp
int credit_xy = r->GetUsedCredit(out_port_xy);
int credit_yx = r->GetUsedCredit(out_port_yx);
if(credit_xy > credit_yx) {
  x_then_y = false; // Choose YX path
} else if(credit_xy < credit_yx) {
  x_then_y = true;  // Choose XY path
} else {
  x_then_y = (RandomInt(1) > 0); // Tie breaker
}
```

## 4. Randomized Minimal Routing (ROMM)

ROMM provides a middle ground between deterministic routing and full adaptivity. 

- **Mechanics**: Instead of evaluating congestion at every hop, ROMM randomly selects one or more intermediate minimal nodes between the source and destination at injection. The packet uses deterministic routing (like DOR) to travel to the first intermediate node, then to the second, and finally to the destination.
- **Benefit**: Achieves load balancing similar to adaptive routing without the hardware overhead of continuous credit polling at every hop.
