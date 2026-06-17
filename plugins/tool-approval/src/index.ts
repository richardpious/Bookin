import { definePluginEntry } from "openclaw/plugin-sdk/plugin-entry";

export default definePluginEntry({
  id: "tool-approval",
  name: "Tool Approval",
  description: "Requires user approval before any tool execution",
  register(api) {
    api.on(
      "before_tool_call",
      async (event) => {
        // Log the attempted tool call for visibility
        console.log(`[Tool Approval] Intercepted call to: ${event.toolName}`);
        
        // Return a requireApproval object to pause execution and ask the user
        return {
          requireApproval: {
            title: `Approve tool: ${event.toolName}`,
            description: `Agent is requesting to use '${event.toolName}' with parameters: ${JSON.stringify(event.params)}`,
            severity: "warning",
            timeoutMs: 300_000, // 5 minutes
            timeoutBehavior: "deny",
          },
        };
      },
      { priority: 100 }
    );
  },
});
