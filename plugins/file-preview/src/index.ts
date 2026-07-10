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
      execute: async ({ filepath }, _config, _context) => {
        try {
          await fetch(`${BACKEND_URL}/internal/file-preview`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ filepath, session_key: "" }),
          });
        } catch (err) {
          console.error("[file-open] Failed to notify backend:", err);
        }
        return { action: "preview_requested", filepath };
      },
    }),
  ],
});
