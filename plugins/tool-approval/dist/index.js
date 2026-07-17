"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const plugin_entry_1 = require("openclaw/plugin-sdk/plugin-entry");
exports.default = (0, plugin_entry_1.definePluginEntry)({
    id: "tool-approval",
    name: "Tool Approval",
    description: "Requires user approval before any tool execution",
    register(api) {
        api.on("before_tool_call", async (event) => {
            console.log(`[Tool Approval] DEBUG: toolName=${event.toolName}, params=${JSON.stringify(event.params)}`);
            // --- Log path guardrail ---
            // Normalize any relative or malformed log directory paths in exec commands
            // to the correct absolute path before execution.
            if (event.toolName === "exec" && event.params.command) {
                const projectRoot = process.env.OPENCLAW_HOME || "/home/dell/Documents/Bookin";
                const LOGS_DIR = `${projectRoot}/logs`;
                const CONFIGS_DIR = `${projectRoot}/configs`;
                const BOOKSIM_DIR = `${projectRoot}/booksim`;
                let command = String(event.params.command);
                let modified = false;
                // Fix relative ../logs, ../configs, ../booksim references
                command = command.replace(/\.\.\/logs\b/g, () => { modified = true; return LOGS_DIR; });
                command = command.replace(/\.\.\/configs\b/g, () => { modified = true; return CONFIGS_DIR; });
                command = command.replace(/\.\.\/booksim\b/g, () => { modified = true; return BOOKSIM_DIR; });
                // Fix accidentally created "Bookin.logs" paths
                command = command.replace(/Bookin\.logs/g, () => { modified = true; return LOGS_DIR; });
                if (modified) {
                    console.log(`[Tool Approval] Rewrote path: ${event.params.command} → ${command}`);
                    return { params: { ...event.params, command } };
                }
            }
            // --- Destructive command approval ---
            let requiresApproval = false;
            if (event.toolName === "exec" && event.params.command) {
                const command = String(event.params.command);
                // Match 'rm', 'rmdir', 'unlink', 'shred'
                const destructiveRegex = /\b(rm|rmdir|unlink|shred)\b/;
                if (destructiveRegex.test(command)) {
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
                    timeoutMs: 300000,
                    timeoutBehavior: "deny",
                },
            };
        }, { priority: 100 });
    },
});
