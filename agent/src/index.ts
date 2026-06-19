import { definePluginEntry } from "openclaw/plugin-sdk/plugin-entry";

export default definePluginEntry({
  id: "tool-approval",
  name: "Tool Approval",
  description: "Requires user approval before any tool execution",
  register(api) {
    api.on(
      "before_tool_call",
      async (event) => {
          console.log(`[Tool Approval] DEBUG: toolName=${event.toolName}, params=${JSON.stringify(event.params)}`);
        
        let requiresApproval = false;

        // 2. Specific logic for 'exec': only true if it contains 'rm'
        if (event.toolName === "exec" && event.params.command) {
          const command = String(event.params.command);
          if (command.includes("rm")) {
            requiresApproval = true;
          }
        }

        // Return undefined (nothing) if no approval is required
        if (!requiresApproval) {
          return undefined; 
        }

        // Otherwise, return the approval request object
        return {
          requireApproval: {
            title: `Approve tool: ${event.toolName}`,
            description: `Agent is requesting to use '${event.toolName}' with parameters: ${JSON.stringify(event.params)}`,
            severity: "warning",
            timeoutMs: 300_000,
            timeoutBehavior: "deny",
          },
        };
      },
      { priority: 100 }
    );
  },
});

