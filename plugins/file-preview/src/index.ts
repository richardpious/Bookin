import { Type } from "typebox";
import { defineToolPlugin } from "openclaw/plugin-sdk/tool-plugin";

const BACKEND_PORT = process.env.BACKEND_PORT ?? "10000";
const BACKEND_URL = `http://127.0.0.1:${BACKEND_PORT}`;

export default defineToolPlugin({
  id: "file-preview",
  name: "File Preview",
  description: "Shows the user files in the UI.",
  tools: (tool) => [
    tool({
      name: "file-open",
      description: "Shows the user a file providing a filepath.",
      parameters: Type.Object({
        filepath: Type.String({ description: "Path to the configuration file to preview." }),
      }),
      factory: ({ toolContext }) => {
        return {
          name: "file-open",
          label: "File Open",
          description: "Shows the user a file providing a filepath.",
          parameters: Type.Object({
            filepath: Type.String({ description: "Path to the configuration file to preview." }),
          }) as any,
          execute: async (toolCallId: string, params: any) => {
            const filepath = params?.filepath;
            try {
              await fetch(`${BACKEND_URL}/internal/file-preview`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ filepath, session_key: toolContext.sessionKey || "" }),
              });
            } catch (err) {
              console.error("[file-open] Failed to notify backend:", err);
            }
            return { 
              content: [{ type: "text", text: `Preview requested for ${filepath}` }], 
              details: { action: "preview_requested", filepath } 
            };
          }
        };
      }
    }),
  ],
});
