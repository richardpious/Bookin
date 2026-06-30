# File Organization Protocol

This protocol defines the mandatory structure for simulation data to ensure consistency and auditability. All simulation work must follow this hierarchy:

## Directory Structure
```text
../logs/
└── session_YYYY_MM_DD_HH_MM/
    └── run_<n>/
```

## Standard Procedures
1.  **Preparation**: Before any simulation, identify or create the current `session_[timestamp]` directory.
2.  **Execution**: 
    *   Create and change into a new, sequential `run_<n>/` directory.
    *   Execute simulations **exclusively** from within this run folder.
    *   All simulation artifacts (logs, stats, etc.) must be contained within this run folder.
3.  **Configuration**: Use configs from `../configs/`. **Do not modify base configurations.**

## Prohibited Behaviors
*   Running simulations from the project root or arbitrary directories.
*   Storing files directly in `logs/` or `session_` folders without a `run_` sub-directory.
*   Mixing outputs from multiple runs in a single folder.

*Note: This structure is mandatory unless explicitly overridden by direct user instruction.*