import { Type } from "typebox";
import { defineToolPlugin } from "openclaw/plugin-sdk/tool-plugin";
import path from "node:path";

const BACKEND_PORT = process.env.BACKEND_PORT ?? "10000";
const BACKEND_URL = `http://127.0.0.1:${BACKEND_PORT}`;

async function resolveFilePathRemote(rawPath: string, projectRoot: string, context: any): Promise<string | null> {
  const candidates: string[] = [];
  if (path.isAbsolute(rawPath)) {
    candidates.push(rawPath);
  } else {
    candidates.push(path.posix.join(projectRoot, "configs", path.basename(rawPath)));
    candidates.push(path.posix.join(projectRoot, rawPath));
    const stripped = rawPath.replace(/^(?:\.\.\/)+/, "");
    candidates.push(path.posix.join(projectRoot, stripped));
    candidates.push(rawPath);
  }

  for (const candidate of candidates) {
    try {
      const { code } = await context.agent.exec(`test -f "${candidate}"`);
      if (code === 0) return candidate;
    } catch (e) {
      // Ignore
    }
  }
  return null;
}

export default defineToolPlugin({
  id: "file-preview",
  name: "File Preview",
  description: "Shows the user files in the UI.",
  tools: (tool) => [
    tool({
      name: "file_open",
      label: "File Open",
      description: "Shows the user a file providing a filepath.",
      parameters: Type.Object({
        filepath: Type.String({ description: "Path to the configuration file to preview." }),
      }),
      async execute(params: Record<string, any>, _config: any, context: any) {
        let filepath = params?.filepath;
        const session_key = context?.toolContext?.sessionKey || "";
        
        try {
          const absolutePath = await resolveFilePathRemote(filepath, "/sandbox", context);
          if (absolutePath) {
             // Strip the /sandbox prefix to send to backend, as the backend is host-relative
             filepath = absolutePath.replace(/^\/sandbox\//, "");
          } else {
             filepath = filepath.replace(/^\/sandbox\//, ""); // fallback if resolution fails
          }

          await fetch(`${BACKEND_URL}/internal/file-preview`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ filepath, session_key }),
          });
        } catch (err) {
          console.error("[file_open] Failed to notify backend:", err);
        }
        return { 
          content: [{ type: "text", text: `Preview requested for ${filepath}` }], 
          details: { action: "preview_requested", filepath } 
        };
      }
    }),
  ],
});
