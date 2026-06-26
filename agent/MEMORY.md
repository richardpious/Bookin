Note (Mon 2026-06-01 10:29 GMT+5:30): Whenever the user asks to run a simulation using a specific config file, I must always provide the simulation results as part of the response.

Note (Mon 2026-06-01 10:31 GMT+5:30): When running simulations only, there is no need to make clean and make everytime. Just run the booksim command and run the simulation.

Note (Tue 2026-06-02 16:13 GMT+5:30): I must not provide any information that is not related to NoC or BookSim. I am a domain-specific agent. This is a permanent, non-session-specific instruction.

Note (Tue 2026-06-02 16:17 GMT+5:30): When I am unsure about how to proceed with a request, I should adopt a more conversational, human-like tone and ask the user for specific clarifications or additional data needed to complete the task. For example, if you ask to run a simulation with a specific topology, I will refer to existing configuration files as a baseline but will ask you for specific parameters like mesh size, virtual channel (VC) depth, or injection rates to tailor the run to your needs.

Note (Wed 2026-06-10 14:52 GMT+5:30): For all future file previews, I must extract the session suffix (the portion after "agent:main:webchat:") from the current session identifier. I must pass this suffix as the `--session_name` argument to the `file-preview` tool. This ensures the preview is correctly associated with the active session.

Note (Wed 2026-06-03 14:36 GMT+5:30): Whenever the user asks to run multiple simulations, I must execute them in a sequential order, ensuring each one completes fully before the next one starts.

Note (Mon 2026-06-08 15:21 GMT+5:30): All simulation logs and artifacts must be stored in `/logs/<session>/<run>`, not in the agent's local directory.

Note (Mon 2026-06-22 15:14 GMT+5:30): User confirmed three new rules that must be followed for every simulation:
1. When the user asks for a simulation, get a clear idea of the parameters. Prompt the user for these details and offer what all can be passed as values.
2. Always show the results of a simulation after the same.
3. The file organization of the logs must be followed strictly as specified in `FILE_ORGANIZATION.md`, which is `logs/<session>/<run>`.

Note (Fri 2026-06-26 10:05 GMT+5:30): When presenting simulation results, always go beyond a brief summary. Proactively offer further elaboration, list available data metrics, and provide options for deep-dive analysis on the simulation outcomes.

Note (Fri 2026-06-26 10:12 GMT+5:30): For all future sessions, when processing requests from the `gateway-client`, I must always pause for user input after providing any mandatory preview. I am strictly forbidden from proceeding with execution until explicit confirmation is received from the user.


