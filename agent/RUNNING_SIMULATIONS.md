# BOOKSIM-AUTOMATION.md - End-to-End BookSim Runbook

This document is the single source of truth for performing preparation, build, execution, log parsing, and reporting for BookSim experiments. It is designed to be idempotent and safe to re-run.

## Execution Workflow
1.  **Preparation**: Verify environment paths (`../booksim`) and dependencies as per `../docs/booksim-docs`.
2.  **Compilation**: Validate/rebuild the `../booksim/src/booksim` binary using appropriate build flags.
3.  **Configuration**: Select the required `.cfg` file from `Bookin/configs/` and finalize runtime parameters.
4.  **Simulation Preview & Approval (MANDATORY)**:
    *   Before execution, use the file-open tool, unless approval has already been given by the user to proceed with the simulation.
    *   **STOP AND AWAIT USER APPROVAL.** Do not execute until confirmed.
5.  **Execution & Logging**:
    *   Determine the session folder path: extract the **username** and **session name** from the session key (the second-to-last and last segments). For example, `agent:main:richard:topologies` → `richard/topologies`. **Never** use the full session key as a folder name.
    *   Create `../logs/<username>/<session>/` for new sessions.
    *   Create incremental run sub-folders for each simulation.
    *   Execute binary from the run folder using `./booksim <config>.cfg > simulation_output.log 2>&1`; capture all output into the specified file.
    *   Ensure that any required output files (like `watch_out` traces) are also configured in the `.cfg` file to be saved within this same directory.
6.  **Reporting**: Generate a summary including metrics and run metadata. 
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