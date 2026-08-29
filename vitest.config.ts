import path from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

const rootDir = path.dirname(fileURLToPath(import.meta.url));

/**
 * Vitest previously ran without a config, so any test whose module graph
 * touched a `@/…` import failed to resolve and silently reported "0 test".
 * Mirror the `paths` mapping from `tsconfig.json` so those suites run.
 */
export default defineConfig({
  resolve: {
    alias: [{ find: /^@\//, replacement: `${rootDir}/` }],
  },
  test: {
    // `app/**` and `components/**` colocate tests next to the source they cover.
    include: ["**/*.{test,spec}.{ts,tsx}"],
    exclude: [
      "**/node_modules/**",
      "**/.next/**",
      "**/prisma/generated/**",
      // Live gateway suites — run with `bun run test:e2e:rithmic`.
      "**/*.e2e.test.ts",
      // Written against `bun:test`; run it with `bun test <path>`.
      "app/[locale]/dashboard/components/filters/active-filter-model.test.ts",
    ],
  },
});
