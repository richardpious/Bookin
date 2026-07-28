# BOOKSIM-AUTOMATION.md - End-to-End BookSim Runbook

This document is the single source of truth for performing preparation, build, execution, log parsing, and reporting for BookSim experiments. It is designed to be idempotent and safe to re-run.

## Execution Workflow
1.  **Preparation**: Verify environment paths (`../booksim`) and dependencies as per `../docs/booksim-docs`.
2.  **Compilation**: Validate/rebuild the `../booksim/src/booksim` binary using appropriate build flags.
3.  **Configuration & Generation**: Proactively generate/create the complete required `.cfg` file directly using standard parameters (referencing existing configs in `../configs/` if needed). Do NOT search C++ source files in `../booksim/src/` to write `.cfg` files, and do NOT show raw base templates asking the user "how about we edit this".
4.  **Simulation Preview & Approval (MANDATORY)**:
    *   Once the complete config file is created/finalized, use the `file-open` tool to display the finalized configuration preview to the user. Do not show raw template configs.
    *   **STOP AND AWAIT USER APPROVAL.** Do not execute until confirmed by the user.
5.  **Execution & Logging (Single Tool Call via `run_simulation`)**:
    *   Once approved, invoke the `run_simulation` tool with:
        - `config_filepath`: path to the prepared configuration file.
        - `run_descriptor`: unique descriptor for the run (e.g., `mesh4x4_uniform` or `rate0.05`).
        - `session_path`: user and session folder path (e.g., `richard/topologies`).
    *   The `run_simulation` tool automatically:
        - Computes the next incremental run index (`run_01_<run_descriptor>`, `run_02_...`).
        - Creates the run directory (`../logs/<session_path>/run_<n>_<run_descriptor>/`).
        - Stages the configuration file specifically as `config.cfg`.
        - Executes `./booksim config.cfg > simulation_output.log 2>&1` sequentially.
        - Parses `simulation_output.log` and returns extracted performance metrics (latency, throughput, packet rates).
5a. **Error Recovery & Self-Correction (MANDATORY)**:
    *   If `run_simulation` returns `success: false`, do NOT give up or end your turn immediately.
    *   Inspect the returned `log_snippet` to diagnose the syntax error or invalid parameter.
    *   Edit the `.cfg` file to correct the parameter error.
    *   Preview the updated configuration via `file-open`, ask for user approval, and re-invoke `run_simulation` to complete the run successfully.
6.  **Reporting**: Present the extracted metrics summary returned by `run_simulation` to the user in chat.
7.  **Documentation**: Return results to the user; update persistent records/memory files.

## Post-simulation

## Core Knowledge & Parameters
My operational knowledge includes:
*   **Builds**: Managing `make`, `make clean`, and custom `DEFINE` flags.
*   **Execution**: Handling CLI overrides and multi-config workflows.
*   **Modes (`sim_type`)**: 
    *   `latency` (default): Convergent average latency.
    *   `throughput`: Saturation point profiling.
    *   `batch`: Fixed-count packet delivery time.
*   **Control Parameters**:
    *   **Continuous**: `warmup_periods`, `sample_period`, `max_samples`, `stopping_thres`, `latency_thres`.
    *   **Batch**: `batch_size`, `batch_count`, `sent_packets_out`.
    *   **General**: `seed`, `include_queuing`, `print_activity`, `print_csv_results`.

*For detailed log parsing and metric extraction methods, refer to `LOG_PARSING.md`.*