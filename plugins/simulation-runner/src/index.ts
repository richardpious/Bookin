import { Type } from "typebox";
import { defineToolPlugin } from "openclaw/plugin-sdk/tool-plugin";
import fs from "node:fs/promises";
import path from "node:path";
import { exec } from "node:child_process";
import { promisify } from "node:util";

const execAsync = promisify(exec);

/**
 * Searches candidate paths for the target config file to handle all workspace & relative path variations.
 */
async function resolveConfigPath(rawPath: string, projectRoot: string): Promise<string | null> {
  const candidates: string[] = [];

  if (path.isAbsolute(rawPath)) {
    candidates.push(rawPath);
  } else {
    // 1. Primary canonical location: inside configs/ directory (e.g. /home/dell/Documents/Bookin/configs/filename.cfg)
    candidates.push(path.resolve(projectRoot, "configs", path.basename(rawPath)));
    // 2. Relative to project root (/home/dell/Documents/Bookin)
    candidates.push(path.resolve(projectRoot, rawPath));
    // 3. Stripped leading ../ relative to project root (e.g. ../configs/file.cfg -> configs/file.cfg)
    const stripped = rawPath.replace(/^(?:\.\.\/)+/, "");
    candidates.push(path.resolve(projectRoot, stripped));
    // 4. Relative to current working directory (agent workspace)
    candidates.push(path.resolve(process.cwd(), rawPath));
    // 5. Stripped leading ../ relative to process.cwd()
    candidates.push(path.resolve(process.cwd(), stripped));
  }

  console.log(`[run_simulation] Resolving config path for '${rawPath}'. Candidate paths to check:`, candidates);

  for (const candidate of candidates) {
    try {
      await fs.access(candidate);
      console.log(`[run_simulation] -> SUCCESS: Found valid config file at '${candidate}'`);
      return candidate;
    } catch {
      console.log(`[run_simulation] -> Checked '${candidate}' (not found)`);
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
        console.log(`[run_simulation] INVOCATION STARTED`);
        console.log(`[run_simulation] Raw parameters received:`, JSON.stringify(params, null, 2));

        // Parameter extraction supporting common alias naming conventions
        const rawConfigPath = String(
          params?.config_filepath || params?.configFilepath || params?.config_path || params?.config || ""
        ).trim();

        const runDescriptor = String(
          params?.run_descriptor || params?.runDescriptor || params?.descriptor || params?.run_name || "run"
        ).trim();

        let sessionPath = String(
          params?.session_path || params?.sessionPath || params?.session || ""
        ).trim();

        console.log(`[run_simulation] Parameter extraction: rawConfigPath='${rawConfigPath}', runDescriptor='${runDescriptor}', sessionPath='${sessionPath}'`);

        if (!rawConfigPath) {
          console.error(`[run_simulation] FAILED: Missing required argument 'config_filepath'`);
          return {
            success: false,
            error: "Missing required argument: config_filepath (or config_path) must be provided."
          };
        }

        try {
          const projectRoot = process.env.OPENCLAW_HOME || "/home/dell/Documents/Bookin";
          console.log(`[run_simulation] Environment info: process.cwd()='${process.cwd()}', projectRoot='${projectRoot}'`);

          // Handle session key formatting
          if (!sessionPath && context?.toolContext?.sessionKey) {
            sessionPath = context.toolContext.sessionKey;
            console.log(`[run_simulation] Using sessionKey from context: '${sessionPath}'`);
          }
          if (!sessionPath) {
            sessionPath = "default/session";
          } else if (sessionPath.includes(":")) {
            const parts = sessionPath.split(":");
            if (parts.length >= 2) {
              sessionPath = `${parts[parts.length - 2]}/${parts[parts.length - 1]}`;
            }
          }
          console.log(`[run_simulation] Final resolved sessionPath: '${sessionPath}'`);

          // Resilient configuration file path resolution
          const absoluteConfigPath = await resolveConfigPath(rawConfigPath, projectRoot);
          if (!absoluteConfigPath) {
            const errString = `Config file not found. Checked candidate locations for: '${rawConfigPath}' in project root '${projectRoot}' and workspace '${process.cwd()}'.`;
            console.error(`[run_simulation] FAILED: ${errString}`);
            return {
              success: false,
              error: errString
            };
          }

          // Target session directory under logs/
          const baseSessionDir = path.resolve(projectRoot, "logs", sessionPath);
          await fs.mkdir(baseSessionDir, { recursive: true });
          console.log(`[run_simulation] Base session log directory: '${baseSessionDir}'`);

          // Check if an existing run directory already exists for this descriptor (e.g. on retries)
          const existingEntries = await fs.readdir(baseSessionDir, { withFileTypes: true });
          let maxRunNum = 0;
          let existingDescriptorFolder: string | null = null;

          for (const entry of existingEntries) {
            if (entry.isDirectory()) {
              const match = entry.name.match(/^run_(\d+)_(.+)$/);
              if (match) {
                const num = parseInt(match[1], 10);
                if (!isNaN(num) && num > maxRunNum) {
                  maxRunNum = num;
                }
                if (match[2] === runDescriptor) {
                  existingDescriptorFolder = entry.name;
                }
              }
            }
          }

          let runFolderName: string;
          if (existingDescriptorFolder) {
            runFolderName = existingDescriptorFolder;
            console.log(`[run_simulation] Reusing existing run folder for descriptor '${runDescriptor}': '${runFolderName}'`);
          } else {
            const nextRunNum = (maxRunNum + 1).toString().padStart(2, "0");
            runFolderName = `run_${nextRunNum}_${runDescriptor}`;
            console.log(`[run_simulation] Creating new run folder: '${runFolderName}'`);
          }

          const runDir = path.join(baseSessionDir, runFolderName);

          // Step 1: Create run folder and stage configuration specifically as config.cfg
          await fs.mkdir(runDir, { recursive: true });
          const targetConfigPath = path.join(runDir, "config.cfg");
          await fs.copyFile(absoluteConfigPath, targetConfigPath);
          console.log(`[run_simulation] Staged config.cfg from '${absoluteConfigPath}' to '${targetConfigPath}'`);

          const logFilePath = path.join(runDir, "simulation_output.log");
          const booksimBinaryPath = "/home/dell/Documents/Bookin/booksim/src/booksim";
          const execCommand = `sh -c '${booksimBinaryPath} config.cfg > simulation_output.log 2>&1'`;
          console.log(`[run_simulation] Executing unsandboxed command: '${execCommand}' in cwd: '${runDir}'...`);

          // Step 3: Sequential binary execution
          try {
            const execStart = Date.now();
            await execAsync(execCommand, { cwd: runDir, maxBuffer: 50 * 1024 * 1024 });
            console.log(`[run_simulation] Binary execution finished successfully in ${Date.now() - execStart} ms.`);
          } catch (execErr: any) {
            console.error(`[run_simulation] EXECUTION FAILED with error:`, execErr.message || execErr);
            let logErrorSnippet = "";
            try {
              const logContent = await fs.readFile(logFilePath, "utf-8");
              if (logContent.length > 3000) {
                logErrorSnippet = `--- START OF LOG (Head) ---\n${logContent.slice(0, 1500)}\n\n... [TRUNCATED ${logContent.length - 3000} chars] ...\n\n--- END OF LOG (Tail) ---\n${logContent.slice(-1500)}`;
              } else {
                logErrorSnippet = logContent;
              }
              console.error(`[run_simulation] Captured error log snippet:\n--- SNIPPET START ---\n${logErrorSnippet}\n--- SNIPPET END ---`);
            } catch (rErr) {
              console.error(`[run_simulation] Could not read log file '${logFilePath}':`, rErr);
            }

            console.log(`[run_simulation] Preserving failed run directory for inspection: '${runDir}'`);

            return {
              success: false,
              run_folder_cleaned: false,
              run_directory: runDir,
              log_file: logFilePath,
              error: `BookSim simulation execution failed. ${execErr.message || String(execErr)}`,
              log_snippet: logErrorSnippet,
              instruction: "BookSim execution failed. Review the log_snippet to find config parsing errors at the top or runtime crashes at the bottom. Do NOT guess blindly if the snippet contains the parser error."
            };
          }

          // Step 4: Metric extraction (after execution completes)
          console.log(`[run_simulation] Reading log file '${logFilePath}' for metric extraction...`);
          const logContent = await fs.readFile(logFilePath, "utf-8");
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

          console.log(`[run_simulation] Extracted metrics:`, JSON.stringify(metrics, null, 2));

          const responsePayload = {
            success: true,
            run_directory: runDir,
            config_file: targetConfigPath,
            log_file: logFilePath,
            run_folder: runFolderName,
            metrics
          };

          console.log(`[run_simulation] INVOCATION COMPLETED SUCCESSFULLY in ${Date.now() - startTime} ms.`);
          console.log(`==================================================\n`);

          return responsePayload;
        } catch (err: any) {
          console.error(`[run_simulation] UNHANDLED EXCEPTION:`, err);
          return {
            success: false,
            error: err.message || String(err)
          };
        }
      },
    }),
  ],
});
