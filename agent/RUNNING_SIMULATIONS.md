# BOOKSIM-AUTOMATION.md - End-to-End BookSim Runbook

This document defines the end-to-end automation runbook I will execute for BookSim experiments. It is the single source of truth for how I perform preparation, build, run, log parsing, and result reporting without requiring user edits.

**Scope**
- Automates the BookSim workflow from environment preparation to result reporting.
- Relies on `../docs/booksim-docs` as the knowledge base for build systems, run commands, log formats, and metrics.
- Executed steps are idempotent where possible and safe to re-run.

## Workspace Organisation

- **Session Folders:** All simulations must be run in a session-specific directory created within `../logs/`. The naming convention is `session_YYYYMMDD_HHMM`. A new session directory should only be created when I am started or explicitly instructed to reset the session.
- **Run Subfolders:** For each individual simulation run, a dedicated run sub-folder must be created within that *current* session directory. The naming convention is `run_N`, where `N` is an incrementing integer starting from 1. The simulation must be executed from within this run-specific folder, with the command pointing to the binary in `../../booksim/src/booksim` to keep the logs contained within that run folder.


## Runbook overview (orchestrated steps)
1)  **Prepare environment**:
    *   Verify necessary paths exist (`../booksim`).
    *   Check dependencies (compilers, libraries) as documented in the knowledge base.
2)  **Build/compile BookSim**:
    *   Validate that the binary (`../booksim/src/booksim`) exists and is executable.
3)  **Configure and set up a run**:
    *   Select a configuration file from `../booksim/src/examples/`.
    *   Prepare simulation parameters (e.g., `sim_type`, `injection_rate`, `seed`).
4)  **Run BookSim simulations with organized logging**:
    *   If and only if this is the first simulation in a new session, create a session-specific timestamped directory in `../logs/` with a name `session_[timestamp]`.
    *   For each individual simulation, create a dedicated run sub-folder within the current session's `../logs/[session]` directory with an incremental naming convention..
    *   Execute the simulation from inside the run folder, pointing to the binary at `../../..booksim/src/booksim`.
    *   Record simulation output (including errors) to `simulation.log` within that folder.
5)  **Generate concise summary/report**:
    *   Create a human-readable summary and/or machine-readable report containing metrics and run metadata.
6)  **Return results; optional memory/report updates**:
    *   Return the summary to the user.
    *   Append results to a memory file and/or update a persistent report file.

**Learned BookSim Parameters and Modes:**

*   **Compiling BookSim**: Details on using `make`, `make clean`, and build flag customization (`DEFINE`).
*   **Running BookSim**: Basic execution `./booksim [config_file]`, command-line parameter overrides, and handling multiple config files.
*   **Simulation Types**: Explanation of `sim_type` modes: `latency` (default), `throughput`, `batch`.
*   **Simulation Control Parameters**: Key parameters like `sim_count`, `seed`, `latency_thres`, `include_queuing`, `print_activity`, `print_csv_results`.
*   **Simulation Phases**: Details on `warmup_periods`, `warmup_thres`, `sample_period`, `max_samples`, `stopping_thres` for continuous flow.
*   **Batch Mode Parameters**: `batch_size`, `batch_count`, `sent_packets_out` for batch simulations.

This understanding has been integrated into my knowledge base for future simulations.

## Metric Extraction History
(For detailed log parsing and metric extraction, please refer to `LOG_PARSING.md`)
