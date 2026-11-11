import path from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

const rootDir = path.dirname(fileURLToPath(import.meta.url));

/**
 * Rithmic Protocol e2e (`bun run test:e2e:rithmic` and the product-rms CI job).
 * Default `vitest.config.ts` excludes `*.e2e.test.ts` so `bun run test` never
 * opens a Rithmic socket. The OpenAI model eval is a separate file and command
 * (`bun run test:e2e:models`); it imports `server-only` and must not load here.
 */
export default defineConfig({
  resolve: {
    alias: [{ find: /^@\//, replacement: `${rootDir}/` }],
  },
  test: {
    include: ["lib/rithmic-protocol/**/*.e2e.test.ts"],
    exclude: ["**/node_modules/**", "**/.next/**", "**/prisma/generated/**"],
    testTimeout: 90_000,
    hookTimeout: 90_000,
    fileParallelism: false,
    // Print console.log as it happens so GitHub Actions captures live login/RMS lines.
    disableConsoleIntercept: true,
  },
});
