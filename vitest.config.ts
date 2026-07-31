import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

const projectRoot = fileURLToPath(new URL(".", import.meta.url)).replace(/\/$/, "");

export default defineConfig({
  resolve: {
    // Mirror the "@/*" -> "./*" mapping from tsconfig.json. Without it any test
    // that reaches a module importing "@/..." fails to load.
    alias: [{ find: /^@\/(.*)$/, replacement: `${projectRoot}/$1` }],
  },
});
