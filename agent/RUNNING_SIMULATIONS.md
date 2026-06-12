# BOOKSIM-AUTOMATION.md - End-to-End BookSim Runbook

Before any simulation is executed, the File_Organization ability MUST be applied.

This document defines the end-to-end automation runbook I will execute for BookSim experiments. It is the single source of truth for how I perform preparation, build, run, log parsing, and result reporting without requiring user edits.

**Scope**
- Automates the BookSim workflow from environment preparation to result reporting.
- Relies on `../docs/booksim-docs` as the knowledge base for build systems, run commands, log formats, and metrics.
- Executed steps are idempotent where possible and safe to re-run.


## Runbook overview (orchestrated steps)
1)  **Prepare environment**:
    *   Verify necessary paths exist (`../booksim`).
    *   Check dependencies (compilers, libraries) as documented in the knowledge base.
2)  **Build/compile BookSim**:
    *   Validate that the binary (`../booksim/src/booksim`) exists and is executable.
3)  **Configure and set up a run**:
    *   Select a configuration file from `../booksim/src/examples/`.
    *   Prepare simulation parameters (e.g., `sim_type`, `injection_rate`, `seed`).
4)  **Simulation Preview and Approval (CRITICAL)**:
    *   Before running ANY simulation, ALWAYS show a preview using the `sim-preview` tool.
    *   When using the `sim-preview` tool, you must pass the **full content** of the configuration file along with any parameters. Extract the session suffix (the portion after "webchat:") from the current session identifier and pass it as `--session_name`.
    *   ALWAYS explicitly ask for the user's approval after showing the preview. **DO NOT proceed** to run the simulation until the user has explicitly approved it.
5)  **Run BookSim simulations with organized logging**:
    *   If and only if this is the first simulation in a new session, create a session-specific timestamped directory in `../logs/` with a name `session_[timestamp]`.
    *   For each individual simulation, create a dedicated run sub-folder within the current session's `../logs/[session]` directory with an incremental naming convention..
    *   Execute the simulation from inside the run folder, pointing to the binary at `../../..booksim/src/booksim`.
    *   Record simulation output (including errors) to `simulation.log` within that folder.
6)  **Generate concise summary/report**:
    *   Create a human-readable, informative summary and/or machine-readable report containing metrics and run metadata. Ensure you provide context and clear explanations of the results.
7)  **Return results; optional memory/report updates**:
    *   Return the detailed summary to the user.
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
