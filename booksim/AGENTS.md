# BookSim Simulator AGENTS.md

## Purpose
Owns the BookSim network simulator source code, compilation, and base configuration templates.

## Ownership
Simulation Specialist / BookSim Engineering

## Local Contracts
- The simulator source code resides in `src/`.
- Base configurations must be kept in `src/examples/`. Do not modify them directly.

## Work Guidance
- Build/compile BookSim using `make` from the `src/` directory.
- Custom configurations are managed and run outside of the base directory as per the File Organization Protocol (`/home/dell/Documents/claw/agent/FILE_ORGANIZATION.md`).

## Verification
- Verify BookSim builds successfully by running `make` from the `src/` directory and checking that the executable `booksim` is generated.

## Child DOX Index
- None
