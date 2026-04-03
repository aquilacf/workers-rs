import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "vite";
import { cloudflareRustWorker } from "vite-plugin-workers-rs";

export default defineConfig({
  plugins: [tailwindcss(), cloudflareRustWorker()],

  server: {
    watch: {
      ignored: ["**/dist/**", "**/target/**"],
    },
  },

  environments: {
    client: {
      consumer: "client",
      build: {
        outDir: "dist/client",
        emptyOutDir: true,
        copyPublicDir: true,
        rollupOptions: {
          input: { style: "style.css" },
          output: { assetFileNames: "[name].[ext]" },
        },
      },
    },
    worker: {
      consumer: "server",
      build: { outDir: "dist/worker", emptyOutDir: false },
    },
  },
});
