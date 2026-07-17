# File Organization Protocol

This protocol defines the mandatory structure for simulation data to ensure consistency and auditability. All simulation work must follow this hierarchy:

## Session Name Rule
The session name for log directories should include the **username** and the **session name**. These correspond to the second-to-last and last segments of the session key, respectively. For example:
- Session key `agent:main:richard:topologies` → folder path is `richard/topologies`
- Session key `agent:main:alice:mesh_study` → folder path is `alice/mesh_study`

**Never** use the full session key as a folder name. Always extract the username and session name from the key.

## Directory Structure
```text
../logs/
└── <username>/
    └── <session_name>/
        └── run_<n>/
```

## Standard Procedures
1.  **Preparation**: Before any simulation, identify or create the current `<session>` directory.
2.  **Execution**: 
    *   Create and change into a new, sequential `run_<n>/` directory.
    *   Execute simulations **exclusively** from within this run folder.
    *   All simulation artifacts (logs, stats, etc.) must be contained within this run folder.
3.  **Configuration**: Use configs from `../configs/`. **Do not modify base configurations.**

## Prohibited Behaviors
*   Running simulations from the project root or arbitrary directories.
*   Storing files directly in `logs/` or `session_` folders without a `run_` sub-directory.
*   Mixing outputs from multiple runs in a single folder.
*   Using the full session key (e.g., `agent:main:richard:topologies`) as a folder name.
*   Creating log directories anywhere other than `../logs/<username>/`.

*Note: This structure is mandatory unless explicitly overridden by direct user instruction.*