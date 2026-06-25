import os
import subprocess

allocators = ["max_size", "pim", "islip", "loa", "wavefront", "rr_wavefront", "select", "separable_input_first", "separable_output_first"]
config_base = "../booksim/src/configs/mesh6x6_generated.cfg"
output_dir = "/home/dell/Documents/claw/logs/test6/allocator_comparison"

if not os.path.exists(output_dir):
    os.makedirs(output_dir)

results = {}

for alloc in allocators:
    print(f"Running simulation with allocator: {alloc}")
    config_file = f"{output_dir}/mesh6x6_{alloc}.cfg"
    with open(config_base, 'r') as f:
        config_content = f.read()
    
    # Update config with current allocator
    new_config = config_content.replace("injection_rate = 0.2;", "injection_rate = 0.05;") + f"\nvc_allocator = {alloc};\n"
    
    with open(config_file, 'w') as f:
        f.write(new_config)
    
    log_file = f"{output_dir}/results_{alloc}.txt"
    # Assuming the booksim binary is in ../booksim/src/
    cmd = f"../booksim/src/booksim {config_file} > {log_file}"
    subprocess.run(cmd, shell=True)
    
    # Simple result extraction (latency)
    with open(log_file, 'r') as f:
        for line in f:
            if "Average latency" in line:
                results[alloc] = line.split(":")[-1].strip()
                break

print("\n--- Summary Results ---")
for alloc, latency in results.items():
    print(f"{alloc}: {latency}")
