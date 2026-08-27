import path from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

const rootDir = path.dirname(fileURLToPath(import.meta.url));

/**
 * Live / secrets-gated suites. Default `vitest.config.ts` excludes `*.e2e.test.ts`
 * so `bun run test` never opens a Rithmic socket even if e2e env vars are set.
 */
export default defineConfig({
  resolve: {
    alias: [{ find: /^@\//, replacement: `${rootDir}/` }],
  },
  test: {
    include: ["**/*.e2e.test.ts"],
    exclude: ["**/node_modules/**", "**/.next/**", "**/prisma/generated/**"],
    testTimeout: 90_000,
    hookTimeout: 90_000,
    fileParallelism: false,
  },
});
