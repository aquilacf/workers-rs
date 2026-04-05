import { cloudflare, type PluginConfig } from "@cloudflare/vite-plugin";
import type { Plugin } from "vite";
import {
  createRustBuildPlugin,
  DEFAULT_DEBOUNCE_MS,
  DEFAULT_ENVIRONMENT_NAME,
  DEFAULT_MAX_RETRIES,
  DEFAULT_OUT_DIR,
  DEFAULT_RELEASE,
  type ResolvedRustBuildOptions,
} from "./vite-plugin-workers-rs.js";

export interface RustBuildOptions {
  /**
   * The Vite environment name for the worker.
   * @default "worker"
   */
  environmentName?: string;

  /**
   * Intermediate output directory for worker-build (Rust compilation).
   * Must match the `main` path in wrangler.jsonc.
   * @default "build"
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

  /**
   * Debounce delay in milliseconds before triggering a rebuild on file change.
   * @default 3000
   */
  debounceMs?: number;
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
    environmentName: opts?.environmentName ?? DEFAULT_ENVIRONMENT_NAME,
    outDir: opts?.outDir ?? DEFAULT_OUT_DIR,
    release: opts?.release ?? DEFAULT_RELEASE,
    maxRetries: opts?.maxRetries ?? DEFAULT_MAX_RETRIES,
    extraArgs: opts?.extraArgs ?? [],
    debounceMs: opts?.debounceMs ?? DEFAULT_DEBOUNCE_MS,
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
 *       build: { outDir: "dist/worker", emptyOutDir: true },
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
