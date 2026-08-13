# BOOKSIM-AUTOMATION.md - End-to-End BookSim Runbook

This document is the single source of truth for performing preparation, build, execution, log parsing, and reporting for BookSim experiments. It is designed to be idempotent and safe to re-run.

## Execution Workflow
1.  **Preparation**: Verify environment paths (`../booksim` or `/sandbox/booksim`) and dependencies as per `../docs/booksim-docs`.
2.  **Compilation**: Validate/rebuild the `../booksim/src/booksim` (or `/sandbox/booksim/src/booksim`) binary using appropriate build flags.
3.  **Configuration & Generation**: All generated configuration files (`.cfg`) MUST be created inside the configuration directory (`../configs/` for unsandboxed, `/sandbox/configs/` for sandboxed). Do NOT create new folders like `simulations/` or place `.cfg` files outside the configuration directory. Do NOT search C++ source files in the `src` directory to write `.cfg` files, and do NOT show raw base templates asking the user "how about we edit this".
4.  **Simulation Preview & Approval (MANDATORY)**:
    *   Once the complete config file is created/finalized, use the `file_open` tool to display the finalized configuration preview to the user. Do not show raw template configs.
    *   **STOP AND AWAIT USER APPROVAL.** Do not execute until confirmed by the user.
5.  **Execution & Logging (Single Tool Call via `run_simulation`)**:
    *   Once approved, invoke the `run_simulation` tool with:
        - `config_filepath`: path to the prepared configuration file.
        - `run_descriptor`: unique descriptor for the run (e.g., `mesh4x4_uniform` or `rate0.05`).
        - `session_path`: user and session folder path (e.g., `richard/topologies`).
    *   The `run_simulation` tool automatically:
        - Computes the next incremental run index (`run_01_<run_descriptor>`, `run_02_...`).
        - Creates the run directory in the appropriate logs directory (`../logs/<session_path>/run_<n>_<run_descriptor>/` or `/sandbox/runs/run_<n>_<run_descriptor>/`).
        - Stages the configuration file specifically as `config.cfg`.
        - Executes `./booksim config.cfg > simulation_output.log 2>&1` sequentially.
        - Parses `simulation_output.log` and returns extracted performance metrics (latency, throughput, packet rates).
5a. **Error Recovery & Handling**:
    *   If `run_simulation` returns `success: false`, inspect the returned `log_snippet` or log file.
    *   If the issue is a simple syntax error, you may edit the `.cfg` file and try once more.
    *   If the error is ambiguous or fails several times in a row, report the error log snippet directly to the user and request guidance rather than attempting repeated trial-and-error edits.
    *   **IMPORTANT**: If you receive a system error such as "The session was locked by a background process" or an infrastructure failure, DO NOT summarize it as a generic "technical glitch". You MUST explicitly quote the raw error message to the user so they know exactly what failed on the platform side.
6.  **Reporting**: Present the extracted metrics summary returned by `run_simulation` to the user in chat.
7.  **Documentation**: Return results to the user; update persistent records/memory files.

## Post-simulation

## Core Knowledge & Parameters

**CRITICAL**: When constructing simulation configuration files, ALWAYS use the parameter definitions found in the local `data/` folder as your primary reference for valid parameter values and dependencies:
- `data/paramOptions.json`: Allowed values/enums for parameters.
- `data/paramDependencies.json`: Rules for when certain parameters are valid based on other parameters.
- `data/paramDescriptions.json`: Detailed definitions of each parameter.

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