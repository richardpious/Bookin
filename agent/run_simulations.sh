#!/bin/bash
# Define topologies and injection rates
topologies=("mesh" "torus")
rates=(0.05 0.1 0.15 0.2)

for topo in "${topologies[@]}"; do
    for rate in "${rates[@]}"; do
        echo "Running simulation for $topo at rate $rate..."
        # Update config file with new rate
        sed -i "s/injection_rate = .*/injection_rate = $rate;/" ../booksim/src/configs/${topo}4x4_normalized.cfg
        
        # Run simulation
        # Assuming the booksim binary is located in ../booksim/src/booksim
        ../booksim/src/booksim ../booksim/src/configs/${topo}4x4_normalized.cfg > ../booksim/src/configs/${topo}4x4_rate${rate}.log
        
        # Move logs to specified directory
        mkdir -p /home/dell/Documents/Bookin/logs/default/run_${topo}_${rate}
        mv ../booksim/src/configs/${topo}4x4_rate${rate}.log /home/dell/Documents/Bookin/logs/default/run_${topo}_${rate}/
    done
done
