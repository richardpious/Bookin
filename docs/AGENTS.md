# Project Documentation AGENTS.md

## Purpose
Owns the BookSim simulator module documentation, mapping configuration parameters and functionalities to their respective source code files.

## Ownership
Technical Documentation / BookSim Specialist

## Local Contracts
- Documentation is structured into module folders `01_running_simulations` to `09_config_parameters` with `index.md` as the main navigation index.
- All documentation files are written in Markdown.
- References to simulator parameters, structures, or logs must be linked to the corresponding C++ source files in `booksim/src` using relative links.

## Work Guidance
- Keep documentation up-to-date with any changes in the simulator configuration parameters, routing logic, router pipeline, flow control, traffic model, logging formats, and power model.
- Audit links regularly to ensure accuracy.

## Verification
- Verify that all relative links from markdown files to source files in `booksim/src` resolve correctly.

## Child DOX Index
- None
