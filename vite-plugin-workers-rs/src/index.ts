import { cloudflare, type PluginConfig } from "@cloudflare/vite-plugin";
import type { Plugin } from "vite";
import {
  createRustBuildPlugin,
  type ResolvedRustBuildOptions,
} from "./vite-plugin-workers-rs.js";

export interface RustBuildOptions {
  /**
   * The Vite environment name for the worker.
   * @default "worker"
   */
  environmentName?: string;

  /**
   * Output directory for the compiled worker.
   * Must match the directory containing `main` in wrangler.jsonc.
   * @default "dist/worker"
   */
  outDir?: string;

  /**
   * Whether to pass --release to worker-build.
   * @default true
   */
  release?: boolean;

  /**
   * Maximum number of retries for rebuild during dev.
   * @default 2
   */
  maxRetries?: number;

  /**
   * Additional arguments to pass to worker-build.
   * @default []
   */
  extraArgs?: string[];
}

export interface CloudflareRustWorkerOptions {
  /**
   * Options controlling the Rust worker-build step.
   */
  rustBuild?: RustBuildOptions;

  /**
   * Options forwarded directly to @cloudflare/vite-plugin's cloudflare().
   * The `viteEnvironment.name` is automatically set from
   * `rustBuild.environmentName` unless explicitly overridden here.
   */
  cloudflare?: PluginConfig;
}

function resolveRustBuildOptions(
  opts?: RustBuildOptions
): ResolvedRustBuildOptions {
  return {
    environmentName: opts?.environmentName ?? "worker",
    outDir: opts?.outDir ?? "dist/worker",
    release: opts?.release ?? true,
    maxRetries: opts?.maxRetries ?? 2,
    extraArgs: opts?.extraArgs ?? [],
  };
}

/**
 * Creates a Vite plugin array that combines a Rust worker-build step
 * with the official @cloudflare/vite-plugin.
 *
 * @example
 * ```ts
 * import { cloudflareRustWorker } from "vite-plugin-workers-rs";
 *
 * export default defineConfig({
 *   plugins: [cloudflareRustWorker()],
 *   environments: {
 *     worker: {
 *       consumer: "server",
 *       build: { outDir: "dist/worker", emptyOutDir: false },
 *     },
 *   },
 * });
 * ```
 */
export function cloudflareRustWorker(
  options?: CloudflareRustWorkerOptions
): Plugin[] {
  const rustOpts = resolveRustBuildOptions(options?.rustBuild);

  const cfConfig: PluginConfig = {
    ...options?.cloudflare,
    viteEnvironment: {
      name: rustOpts.environmentName,
      ...options?.cloudflare?.viteEnvironment,
    },
  };

  const rustBuildPlugin = createRustBuildPlugin(rustOpts);
  const cloudflarePlugins = cloudflare(cfConfig);

  return [rustBuildPlugin, ...cloudflarePlugins];
}
