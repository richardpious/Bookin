# FILE_ORGANIZATION.md - File Organization Protocol

This file establishes the organizational structure for all simulation-related files and outputs within the agent workspace.

## Directory Structure

```
/home/dell/Documents/claw/
├── logs/                     # Main directory for all simulation logs
│   ├── session_YYYY_MM_DD_HH_MM/  # Session folders
│   │   ├── run_1/              # Log files for run 1
│   │   ├── run_2/              # Log files for run 2
│   │   └── ...
│   └── ...
```

## File Naming Conventions

### Simulation Logs
```
logs/session_{session_datetime}/run_{n}/{topology}_{config}_{logtype}.txt
```

## Standard Procedures

### Before Simulation
1. Identify/Create the current session directory under `logs/`
2. Create the next `run_n` directory within the current session folder

### After Simulation
1. Copy all relevant output files from BookSim directory (e.g., stats.txt, watch_out.txt) to the organized `logs/session_{session_datetime}/run_{n}/` directory.

### Configuration Management
- Base configurations remain in `/home/dell/Documents/claw/booksim/src/examples/`
- Custom configurations go in `/home/dell/Documents/claw/agent/configs/custom/`
- Never modify base configurations directly

## Current Simulation Output Location
BookSim by default writes to: `/home/dell/Documents/claw/booksim/`
Files include: stats.txt, watch_out.txt, injected_flits.txt, received_flits.txt, etc.

## Automation Guidelines
1. Simulations must be executed from inside the `run_{n}/` directory to ensure all generated log files are saved directly into the correct run folder
2. Always copy outputs to organized locations (`logs/session_{session_datetime}/run_{n}/`) immediately after run
3. Never rely on files staying in BookSim directory between runs
4. Maintain clear audit trail from config → run → results

---
*This file should be consulted before any file operation or simulation task.*
*Last updated: $(date)*