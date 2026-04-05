# vite-plugin-workers-rs-unofficial

> **Unofficial** community-maintained Vite plugin. Not affiliated with or endorsed by Cloudflare.

A Vite plugin that integrates Rust [`worker-build`](https://github.com/cloudflare/workers-rs/tree/main/worker-build) with [`@cloudflare/vite-plugin`](https://www.npmjs.com/package/@cloudflare/vite-plugin), letting you develop and deploy Cloudflare Workers written in Rust with Vite's dev server, HMR, and build pipeline.

## Prerequisites

- [Rust](https://www.rust-lang.org/tools/install) toolchain with `wasm32-unknown-unknown` target
- [Cargo](https://doc.rust-lang.org/cargo/)

## Install

```bash
npm install -D vite-plugin-workers-rs-unofficial @cloudflare/vite-plugin vite
```

## Usage

```ts
// vite.config.ts
import { defineConfig } from "vite";
import { cloudflareRustWorker } from "vite-plugin-workers-rs-unofficial";

export default defineConfig({
  plugins: [cloudflareRustWorker()],

  environments: {
    worker: {
      consumer: "server",
      build: { outDir: "dist/worker", emptyOutDir: false },
    },
  },
});
```

The plugin handles two things:

1. **Rust build** installs `worker-build` via Cargo and compiles your Rust worker to WebAssembly on startup and on file changes during dev.
2. **Cloudflare integration** configures `@cloudflare/vite-plugin` so Vite's dev server proxies to the Workers runtime.

## Options

```ts
cloudflareRustWorker({
  rustBuild: {
    environmentName: "worker", // Vite environment name (default: "worker")
    outDir: "build",           // Must match wrangler.jsonc `main` directory (default: "build")
    release: true,             // Pass --release to worker-build (default: true)
    maxRetries: 2,             // Rebuild retry attempts during dev (default: 2)
    debounceMs: 3000,          // Delay before triggering rebuild on file change (default: 3000)
    extraArgs: [],             // Additional worker-build CLI args (default: [])
  },
  cloudflare: {
    // Any @cloudflare/vite-plugin options.
    // `viteEnvironment.name` is set automatically from `rustBuild.environmentName`.
  },
});
```

## How It Works

During `vite dev`, the plugin:

1. Runs `cargo install --git https://github.com/cloudflare/workers-rs worker-build` to ensure the build tool is available.
2. Compiles the worker with `worker-build` into the configured `outDir`.
3. Configures Vite's file watcher to ignore `target/`, `outDir/` and `.wrangler/`.
4. Watches for file changes, additions, and deletions, then rebuilds the worker with debouncing.
5. Restarts the Vite dev server after a successful rebuild.

During `vite build`, step 1-2 run once, then `@cloudflare/vite-plugin` takes over to bundle the worker for deployment.

## Example

See the [vite-tailwind example](https://github.com/aquilacf/workers-rs/tree/main/examples/vite-tailwind) for a complete project using this plugin with Tailwind CSS.

## License

[MIT OR Apache-2.0](./LICENSE)
