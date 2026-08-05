import { Type } from "typebox";
import { defineToolPlugin } from "openclaw/plugin-sdk/tool-plugin";
import path from "node:path";

/**
 * Searches candidate paths for the target config file to handle all workspace & relative path variations.
 */
async function resolveConfigPathRemote(rawPath: string, projectRoot: string, context: any): Promise<string | null> {
  const candidates: string[] = [];

  if (path.isAbsolute(rawPath)) {
    candidates.push(rawPath);
  } else {
    // 1. Primary canonical location: inside configs/ directory
    candidates.push(path.posix.join(projectRoot, "configs", path.basename(rawPath)));
    // 2. Relative to project root
    candidates.push(path.posix.join(projectRoot, rawPath));
    // 3. Stripped leading ../ relative to project root
    const stripped = rawPath.replace(/^(?:\.\.\/)+/, "");
    candidates.push(path.posix.join(projectRoot, stripped));
    // 4. Relative to current working directory (agent workspace)
    candidates.push(rawPath);
  }

  console.log(`[run_simulation] Resolving config path for '${rawPath}'. Candidate paths to check:`, candidates);

  for (const candidate of candidates) {
    try {
      const { code } = await context.agent.exec(`test -f "${candidate}"`);
      if (code === 0) {
        console.log(`[run_simulation] -> SUCCESS: Found valid config file at '${candidate}'`);
        return candidate;
      } else {
        console.log(`[run_simulation] -> Checked '${candidate}' (not found)`);
      }
    } catch (e) {
      console.log(`[run_simulation] -> Error checking '${candidate}':`, e);
    }
  }

  console.error(`[run_simulation] -> ERROR: Could not find config file '${rawPath}' in any candidate path.`);
  return null;
}

export default defineToolPlugin({
  id: "simulation-runner",
  name: "Simulation Runner",
  description: "Executes BookSim simulations sequentially, creating run directories, staging config.cfg, logging output, and returning parsed metrics.",
  tools: (tool) => [
    tool({
      name: "run_simulation",
      label: "Run Simulation",
      description: "Creates the run folder, stages config.cfg, executes BookSim sequentially, logs output, and extracts performance metrics for the agent to present to the user.",
      parameters: Type.Object({
        config_filepath: Type.String({ description: "Path to the prepared configuration (.cfg) file." }),
        run_descriptor: Type.String({ description: "Unique identifier/descriptor for the run folder (e.g. mesh4x4_uniform, rate0.05)." }),
        session_path: Type.Optional(Type.String({ description: "User and session path (e.g. richard/topologies). Defaults to default/session if omitted." })),
      }),
      async execute(params: Record<string, any>, _config: any, context: any) {
        const startTime = Date.now();
        console.log(`\n==================================================`);
        console.log(`[run_simulation] INVOCATION STARTED (REMOTE MODE)`);
        console.log(`[run_simulation] Raw parameters received:`, JSON.stringify(params, null, 2));

        const rawConfigPath = String(
          params?.config_filepath || params?.configFilepath || params?.config_path || params?.config || ""
        ).trim();

        const runDescriptor = String(
          params?.run_descriptor || params?.runDescriptor || params?.descriptor || params?.run_name || "run"
        ).trim();

        let sessionPath = String(
          params?.session_path || params?.sessionPath || params?.session || ""
        ).trim();

        if (!rawConfigPath) {
          return {
            success: false,
            error: "Missing required argument: config_filepath (or config_path) must be provided."
          };
        }

        try {
          // OpenShell default primary writable workspace
          const projectRoot = "/sandbox"; 
          
          if (!sessionPath && context?.toolContext?.sessionKey) {
            sessionPath = context.toolContext.sessionKey;
          }
          if (!sessionPath) {
            sessionPath = "default/session";
          } else if (sessionPath.includes(":")) {
            const parts = sessionPath.split(":");
            if (parts.length >= 2) {
              sessionPath = `${parts[parts.length - 2]}/${parts[parts.length - 1]}`;
            }
          }

          const absoluteConfigPath = await resolveConfigPathRemote(rawConfigPath, projectRoot, context);
          if (!absoluteConfigPath) {
            return {
              success: false,
              error: `Config file not found. Checked candidate locations for: '${rawConfigPath}'`
            };
          }

          const baseSessionDir = path.posix.join(projectRoot, "runs");
          await context.agent.exec(`mkdir -p "${baseSessionDir}"`);

          const lsRes = await context.agent.exec(`ls -1 "${baseSessionDir}"`);
          const existingEntries = (lsRes.stdout || "").split("\n").filter((v: string) => v.trim() !== "");
          
          let maxRunNum = 0;
          let existingDescriptorFolder: string | null = null;

          for (const entry of existingEntries) {
            const match = entry.match(/^run_(\d+)_(.+)$/);
            if (match) {
              const num = parseInt(match[1], 10);
              if (!isNaN(num) && num > maxRunNum) {
                maxRunNum = num;
              }
              if (match[2] === runDescriptor) {
                existingDescriptorFolder = entry;
              }
            }
          }

          let runFolderName: string;
          if (existingDescriptorFolder) {
            runFolderName = existingDescriptorFolder;
          } else {
            const nextRunNum = (maxRunNum + 1).toString().padStart(2, "0");
            runFolderName = `run_${nextRunNum}_${runDescriptor}`;
          }

          const runDir = path.posix.join(baseSessionDir, runFolderName);

          await context.agent.exec(`mkdir -p "${runDir}"`);
          const targetConfigPath = path.posix.join(runDir, "config.cfg");
          await context.agent.exec(`cp "${absoluteConfigPath}" "${targetConfigPath}"`);

          const logFilePath = path.posix.join(runDir, "simulation_output.log");
          const booksimBinaryPath = "/sandbox/booksim/src/booksim";
          const execCommand = `sh -c '${booksimBinaryPath} config.cfg > simulation_output.log 2>&1'`;
          
          console.log(`[run_simulation] Executing remote command: '${execCommand}' in cwd: '${runDir}'...`);

          const { code, stdout, stderr } = await context.agent.exec(execCommand, { cwd: runDir });
          
          if (code !== 0) {
            console.error(`[run_simulation] EXECUTION FAILED.`);
            
            const catRes = await context.agent.exec(`cat "${logFilePath}"`);
            const logContent = catRes.stdout || "";
            
            let logErrorSnippet = logContent;
            if (logContent.length > 3000) {
              logErrorSnippet = `--- START OF LOG (Head) ---\n${logContent.slice(0, 1500)}\n\n... [TRUNCATED] ...\n\n--- END OF LOG (Tail) ---\n${logContent.slice(-1500)}`;
            }
            
            return {
              success: false,
              run_folder_cleaned: false,
              run_directory: runDir,
              log_file: logFilePath,
              error: `BookSim simulation execution failed. Exit code ${code}.`,
              log_snippet: logErrorSnippet,
              instruction: "BookSim execution failed. Review the log_snippet to find config parsing errors at the top or runtime crashes at the bottom."
            };
          }

          console.log(`[run_simulation] Reading log file '${logFilePath}' for metric extraction...`);
          const catRes = await context.agent.exec(`cat "${logFilePath}"`);
          const logContent = catRes.stdout || "";
          
          const metrics: Record<string, any> = {};

          const packetLatencyAvg = logContent.match(/Packet latency average\s*=\s*([\d\.]+)/);
          if (packetLatencyAvg) metrics.packet_latency_avg = parseFloat(packetLatencyAvg[1]);

          const packetLatencyMin = logContent.match(/Packet latency average[\s\S]*?\tminimum\s*=\s*([\d\.]+)/);
          if (packetLatencyMin) metrics.packet_latency_min = parseFloat(packetLatencyMin[1]);

          const packetLatencyMax = logContent.match(/Packet latency average[\s\S]*?\tmaximum\s*=\s*([\d\.]+)/);
          if (packetLatencyMax) metrics.packet_latency_max = parseFloat(packetLatencyMax[1]);

          const netLatencyAvg = logContent.match(/Network latency average\s*=\s*([\d\.]+)/);
          if (netLatencyAvg) metrics.network_latency_avg = parseFloat(netLatencyAvg[1]);

          const flitLatencyAvg = logContent.match(/Flit latency average\s*=\s*([\d\.]+)/);
          if (flitLatencyAvg) metrics.flit_latency_avg = parseFloat(flitLatencyAvg[1]);

          const injPacketRate = logContent.match(/Injected packet rate average\s*=\s*([\d\.]+)/);
          if (injPacketRate) metrics.injected_packet_rate = parseFloat(injPacketRate[1]);

          const accPacketRate = logContent.match(/Accepted packet rate average\s*=\s*([\d\.]+)/);
          if (accPacketRate) metrics.accepted_packet_rate = parseFloat(accPacketRate[1]);

          const injFlitRate = logContent.match(/Injected flit rate average\s*=\s*([\d\.]+)/);
          if (injFlitRate) metrics.injected_flit_rate = parseFloat(injFlitRate[1]);

          const accFlitRate = logContent.match(/Accepted flit rate average\s*=\s*([\d\.]+)/);
          if (accFlitRate) metrics.accepted_flit_rate = parseFloat(accFlitRate[1]);

          const hopsAvg = logContent.match(/Hops average\s*=\s*([\d\.]+)/);
          if (hopsAvg) metrics.hops_avg = parseFloat(hopsAvg[1]);

          const totalRunTime = logContent.match(/Total run time\s*([\d\.]+)/);
          if (totalRunTime) metrics.total_run_time_sec = parseFloat(totalRunTime[1]);

          const timeCycles = logContent.match(/Time taken is\s*(\d+)\s*cycles/);
          if (timeCycles) metrics.total_cycles = parseInt(timeCycles[1], 10);

          return {
            success: true,
            run_directory: runDir,
            config_file: targetConfigPath,
            log_file: logFilePath,
            run_folder: runFolderName,
            metrics
          };
        } catch (err: any) {
          return {
            success: false,
            error: err.message || String(err)
          };
        }
      },
    }),
  ],
});
