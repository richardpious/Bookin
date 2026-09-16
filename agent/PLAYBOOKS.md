# Playbooks — Intent-Based Workflows

Follow these playbooks to respond to common user intents efficiently. Do NOT make unnecessary tool calls to re-read instructions or explore the filesystem when a playbook covers your situation.

---

## Execution Workflow (Core)

This is the core workflow that all simulation playbooks build on.

### Config Generation
- **CRITICAL**: When constructing configuration files, ALWAYS use the parameter definitions in the local `data/` folder as your primary reference:
  - `data/paramOptions.json`: Allowed values/enums for parameters.
  - `data/paramDependencies.json`: Rules for when certain parameters are valid based on other parameters.
  - `data/paramDescriptions.json`: Detailed definitions of each parameter.
- All generated `.cfg` files MUST be created inside the configuration directory (`../configs/` for unsandboxed, `/sandbox/configs/` for sandboxed).
- Do NOT search C++ source files in `src/` to construct config files.
- Do NOT show raw base templates asking the user "how about we edit this".

### Simulation Preview & Approval (MANDATORY)
- Once the config file is finalized, use the `file_open` tool to display the preview to the user.
- **STOP AND AWAIT USER APPROVAL.** Do not execute until confirmed.

### Execution (via `run_simulation` tool)
- Once approved, invoke `run_simulation` with:
  - `config_filepath`: path to the prepared configuration file.
  - `run_descriptor`: unique descriptor for the run (e.g., `mesh4x4_uniform` or `rate0.05`).
  - `session_path`: user and session folder path (e.g., `richard/topologies`).
- The `run_simulation` tool automatically:
  - Computes the next incremental run index (`run_01_<run_descriptor>`, `run_02_...`).
  - Creates the run directory in the appropriate logs directory.
  - Stages the configuration file as `config.cfg`.
  - Executes `./booksim config.cfg > simulation_output.log 2>&1` sequentially.
  - Parses `simulation_output.log` and returns extracted performance metrics.

### Error Recovery
- If `run_simulation` returns `success: false`, inspect the returned `log_snippet`.
- If the issue is a simple parameter error, edit the `.cfg` file and try once more.
- If the error is ambiguous or fails a second time, present the exact log snippet to the user and ask for guidance.
- **IMPORTANT**: If you receive a system error such as "The session was locked by a background process", you MUST explicitly quote the raw error message to the user.

### Reporting
- Present the extracted metrics summary to the user in chat.
- Provide a brief, beginner-friendly interpretation (see `BOOKSIM_KNOWLEDGE.md` for guidance on interpreting metrics).

### Compilation Rule
- Do NOT run `make`, `make clean`, or any compilation step UNLESS you or the user just modified the BookSim C++ source code in this session.
- The binary is pre-compiled and ready to use.

---

## Playbook 1: "Run a Simulation"

**Trigger**: User says something like "run a simulation", "simulate a mesh", "test uniform traffic", etc.

**Steps**:
1.  **Clarify Intent**: If the user hasn't specified, ask what they want to study. Proactively recommend a starting point:
    - Beginner? Suggest **4×4 mesh, DOR routing, uniform traffic, injection_rate=0.1**.
    - Studying a specific topology? Ask for traffic pattern and injection rate.
    - Keep it to 1-2 clarifying questions max, not a long quiz.
2.  **Generate Config**: Create the full `.cfg` file in the config directory. Use `data/paramOptions.json` for valid values. Do NOT read source files.
3.  **Preview & Approve**: Show the config via `file_open`. Wait for explicit approval.
4.  **Execute**: Call `run_simulation(config_filepath, run_descriptor, session_path)`.
5.  **Interpret Results**: Summarize key metrics (latency, throughput, stall rates) and provide a guided interpretation using your domain knowledge from `BOOKSIM_KNOWLEDGE.md`.

---

## Playbook 2: "Compare Statistics Between Simulations"

**Trigger**: User says something like "compare mesh vs torus", "which one was better?", "compare the last two runs", etc.

**Steps**:
1.  **Identify Runs**: Determine which simulation runs to compare. If already run, locate their logs. If not yet run, execute them first using Playbook 1 (you can skip individual previews if the user approved the batch).
2.  **Parse Metrics**: From each run's `simulation_output.log`, extract:
    - Average packet latency
    - Accepted flit rate / throughput
    - Stall rates (buffer busy, buffer conflict, crossbar conflict)
    - Hop count average
3.  **Present Comparison**: Generate a markdown table comparing the metrics side-by-side. Example:

    | Metric | Mesh 4×4 | Torus 4×4 |
    |--------|----------|-----------|
    | Avg Packet Latency | 35.2 | 28.7 |
    | Accepted Flit Rate | 0.092 | 0.097 |

4.  **Guided Interpretation**: Explain *why* one performed differently (e.g., "Torus has lower latency because wrap-around links reduce the maximum hop count from 6 to 4").

---

## Playbook 3: "Parameter Sweep"

**Trigger**: User says something like "compare all allocators", "sweep injection rates", "test all traffic patterns", etc.

**Steps**:
1.  **Clarify Scope**: Confirm:
    - Which parameter is being swept (e.g., `vc_allocator`, `injection_rate`, `traffic`)?
    - What are the values to sweep? (Refer to `data/paramOptions.json` for valid options.)
    - What is the base configuration? (Suggest a sensible default if user doesn't specify.)
2.  **Generate Base Config**: Create the base `.cfg` file. Show it to the user for approval.
3.  **Execute Sweep**: Run `run_simulation` for each parameter value with a distinct `run_descriptor` for each (e.g., `allocator_islip`, `allocator_pim`, `allocator_wavefront`). Run sequentially for small sweeps (≤5 runs); use subagents for larger batches.
4.  **Aggregate Results**: Collect key metrics from each run.
5.  **Present Findings**: Create a summary table showing how the swept parameter affected performance. Highlight the best-performing value and explain why.

---

## Core Knowledge & Parameters

Operational knowledge for quick reference (see `BOOKSIM_KNOWLEDGE.md` for deep domain knowledge):

*   **Modes (`sim_type`)**:
    *   `latency` (default): Convergent average latency.
    *   `throughput`: Saturation point profiling.
    *   `batch`: Fixed-count packet delivery time.
*   **Control Parameters**:
    *   **Continuous**: `warmup_periods`, `sample_period`, `max_samples`, `stopping_thres`, `latency_thres`.
    *   **Batch**: `batch_size`, `batch_count`, `sent_packets_out`.
    *   **General**: `seed`, `include_queuing`, `print_activity`, `print_csv_results`.
