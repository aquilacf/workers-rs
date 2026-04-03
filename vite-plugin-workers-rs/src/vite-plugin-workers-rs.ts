import { execSync, type ExecSyncOptions } from "child_process";
import { resolve } from "path";
import type { Plugin, ViteDevServer } from "vite";

const DEBOUNCE_MS = 3000;
const WORKER_BUILD_REPO = "https://github.com/cloudflare/workers-rs";

let workerBuilt = false;

export interface ResolvedRustBuildOptions {
  environmentName: string;
  outDir: string;
  release: boolean;
  maxRetries: number;
  extraArgs: string[];
}

export function createRustBuildPlugin(opts: ResolvedRustBuildOptions): Plugin {
  const outFlags = `--out-dir ${opts.outDir}`;
  const releaseFlag = opts.release ? "--release" : "";
  const extraFlags = opts.extraArgs.join(" ");
  const buildFlags = [releaseFlag, outFlags, extraFlags]
    .filter(Boolean)
    .join(" ");

  const INSTALL_AND_BUILD = `cargo install --git ${WORKER_BUILD_REPO} worker-build && worker-build ${buildFlags}`;
  const REBUILD = `worker-build ${buildFlags}`;

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
      if (workerBuilt) return;
      const root = userConfig.root ? resolve(userConfig.root) : process.cwd();
      console.log("[workers-rs] Building worker...");
      execSync(INSTALL_AND_BUILD, getExecOpts(root));
      workerBuilt = true;
    },

    configureServer(server: ViteDevServer) {
      const root = server.config.root;
      const ignoreDirs = [
        resolve(root, opts.outDir),
        resolve(root, "target"),
        resolve(root, ".wrangler"),
        resolve(root, "node_modules"),
      ];

      server.watcher.on("change", (file) => {
        if (ignoreDirs.some((dir) => file.startsWith(dir))) return;
        clearTimeout(debounce);
        debounce = setTimeout(() => {
          const root = server.config.root;
          console.log("[workers-rs] Rebuilding worker...");
          if (runBuild(REBUILD, root)) {
            console.log("[workers-rs] Worker rebuilt. Restarting dev server...");
            server.restart();
          } else {
            console.error(
              "[workers-rs] Worker rebuild failed after all retries."
            );
          }
        }, DEBOUNCE_MS);
      });
    },
  };
}
