import path from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

const rootDir = path.dirname(fileURLToPath(import.meta.url));

/**
 * Live model eval. Not part of `bun run test` or CI.
 * Run with `OPENAI_API_KEY=... bun run test:e2e:models`.
 */
export default defineConfig({
  resolve: {
    alias: [
      { find: /^@\//, replacement: `${rootDir}/` },
      { find: /^server-only$/, replacement: `${rootDir}/test/stubs/server-only.ts` },
    ],
  },
  test: {
    include: ["lib/ai/model-eval.e2e.test.ts"],
    exclude: ["**/node_modules/**", "**/.next/**"],
    testTimeout: 180_000,
    hookTimeout: 30_000,
    fileParallelism: false,
    disableConsoleIntercept: true,
  },
});
