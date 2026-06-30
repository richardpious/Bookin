---
name: "file-preview"
description: "Preview BookSim config for user approval."
---

# File Preview Request
I have prepared the 4x4 torus configuration file for your review.

## File: ../booksim/src/configs/torus4x4.cfg
```
// 4x4 Torus configuration
topology = torus;
k = 4;
n = 2;

// Routing
routing_function = dim_order;

// Flow control
num_vcs = 8;
vc_buf_size = 8;
wait_for_tail_credit = 1;

// Traffic
traffic = uniform;
packet_size = 5;
injection_rate = 0.1;
injection_process = bernoulli;

// Simulation
sim_type = latency;
warmup_periods = 3;
max_samples = 20000;
latency_thres = 500.0;
sim_count = 1;
```

Please confirm if you approve this configuration to proceed with the simulation.
