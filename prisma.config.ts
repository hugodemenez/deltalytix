import { existsSync } from "node:fs";
import { config } from "dotenv";
import { defineConfig } from "prisma/config";

if (existsSync(".env.local")) {
  config({ path: ".env.local", override: true });
}
config();

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    // Use DIRECT_URL (non-pooled, port 5432) for CLI commands like migrate/db push.
    // The pooled DATABASE_URL is used at runtime via the PrismaPg adapter in lib/prisma.ts.
    // `env()` throws if the variable is unset — worktrees and `prisma generate`
    // often have no .env.local yet, and generate does not connect.
    url:
      process.env.DIRECT_URL ||
      process.env.DATABASE_URL ||
      "postgresql://devuser:devpass@localhost:5432/deltalytix_dev",
  },
//   experimental: {
//     externalTables: true,
//   },
//   tables: {
//     external: ["public.users"],
//   },
//   enums: {
//     external: ["public.role"],
//   },
});
