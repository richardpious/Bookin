# BOOKSIM-AUTOMATION.md - End-to-End BookSim Runbook

This document is the single source of truth for performing preparation, build, execution, log parsing, and reporting for BookSim experiments. It is designed to be idempotent and safe to re-run.

## Execution Workflow
1.  **Preparation**: Verify environment paths (`../booksim`) and dependencies as per `../docs/booksim-docs`.
2.  **Compilation**: Validate/rebuild the `../booksim/src/booksim` binary using appropriate build flags.
3.  **Configuration**: Select the required `.cfg` file from `../configs/` and finalize runtime parameters.
4.  **Simulation Preview & Approval (MANDATORY)**:
    *   Before execution, run `sim-preview` with the full config content and current session name (extracted from the webchat ID).
    *   **STOP AND AWAIT USER APPROVAL.** Do not execute until confirmed.
5.  **Execution & Logging**:
    *   Create `../logs/session_[timestamp]/` for new sessions.
    *   Create incremental run sub-folders for each simulation.
    *   Execute binary from the run folder; capture all output to `simulation.log`.
6.  **Reporting**: Generate a summary including metrics and run metadata. 
7.  **Documentation**: Return results to the user; update persistent records/memory files.

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