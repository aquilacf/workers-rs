import { execSync, type ExecSyncOptions } from "child_process";
import { resolve } from "path";
import type { Plugin, ViteDevServer } from "vite";

export const DEFAULT_ENVIRONMENT_NAME = "worker";
export const DEFAULT_OUT_DIR = "build";
export const DEFAULT_RELEASE = true;
export const DEFAULT_WORKER_BUILD_PATH = "worker-build";
export const DEFAULT_MAX_RETRIES = 2;
export const DEFAULT_DEBOUNCE_MS = 3000;
const IGNORED_DIRS = ["target", ".wrangler"];

let workerBuilt = false;

export interface ResolvedRustBuildOptions {
  workerBuildPath: string;
  environmentName: string;
  outDir: string;
  release: boolean;
  maxRetries: number;
  debounceMs: number;
  extraArgs: string[];
}

export function createRustBuildPlugin(opts: ResolvedRustBuildOptions): Plugin {
  const outFlags = `--out-dir ${opts.outDir}`;
  const releaseFlag = opts.release ? "--release" : "";
  const extraFlags = opts.extraArgs.join(" ");
  const buildFlags = [releaseFlag, outFlags, extraFlags]
    .filter(Boolean)
    .join(" ");

  const BUILD_CMD = `${opts.workerBuildPath} ${buildFlags}`;

  let debounce: ReturnType<typeof setTimeout> | undefined;

  function getExecOpts(root: string): ExecSyncOptions {
    return { stdio: "inherit", cwd: root, env: process.env };
  }

  function runBuild(command: string, root: string): boolean {
    const execOpts = getExecOpts(root);
    for (let attempt = 0; attempt <= opts.maxRetries; attempt++) {
      try {
        execSync(command, execOpts);
        return true;
      } catch {
        if (attempt < opts.maxRetries) {
          console.log(
            `[workers-rs] Build attempt ${attempt + 1} failed, retrying in 3s...`
          );
          execSync("sleep 3", execOpts);
        }
      }
    }
    return false;
  }

  return {
    name: "vite-plugin-workers-rs:build",
    enforce: "pre",
    applyToEnvironment: (env) => env.name === opts.environmentName,

    config(userConfig) {
      if (!workerBuilt) {
        const root = userConfig.root ? resolve(userConfig.root) : process.cwd();
        console.log("[workers-rs] Building worker...");
        execSync(BUILD_CMD, getExecOpts(root));
        workerBuilt = true;
      }

      return {
        server: {
          watch: {
            ignored: [
              `**/${opts.outDir}/**`,
              ...IGNORED_DIRS.map((dir) => `**/${dir}/**`),
            ],
          },
        },
      };
    },

    configureServer(server: ViteDevServer) {
      const scheduleRebuild = () => {
        clearTimeout(debounce);
        debounce = setTimeout(() => {
          const root = server.config.root;
          console.log("[workers-rs] Rebuilding worker...");
          if (runBuild(BUILD_CMD, root)) {
            console.log("[workers-rs] Worker rebuilt. Restarting dev server...");
            server.restart();
          } else {
            console.error(
              "[workers-rs] Worker rebuild failed after all retries."
            );
          }
        }, opts.debounceMs);
      };

      server.watcher.on("change", scheduleRebuild);
      server.watcher.on("add", scheduleRebuild);
      server.watcher.on("unlink", scheduleRebuild);
    },
  };
}
