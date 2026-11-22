/**
 * Write the production support-search snapshot.
 *
 * The support lambda reads this JSON instead of the repo. Tracing `app/` and
 * `lib/` source into the function makes Turbopack follow their imports.
 *
 * The tree is read from this script's repo root, not from the process working
 * directory. `SUPPORT_CORPUS_ROOT` overrides that root for tests.
 */
import { writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  MIN_SUPPORT_CORPUS_FILES,
  SUPPORT_CORPUS_SNAPSHOT,
  collectCorpusSources,
} from "../lib/ai/codebase-index";

const override = process.env.SUPPORT_CORPUS_ROOT?.trim();
const repoRoot = override
  ? path.resolve(override)
  : path.join(path.dirname(fileURLToPath(import.meta.url)), "..");

const files = await collectCorpusSources(repoRoot);
const json = JSON.stringify(files);
const megabytes = (Buffer.byteLength(json) / 1024 / 1024).toFixed(2);
console.log(`[support-corpus] ${files.length} files, ${megabytes} MB`);

if (files.length < MIN_SUPPORT_CORPUS_FILES) {
  console.error(
    `[support-corpus] Refusing to write ${SUPPORT_CORPUS_SNAPSHOT}: ${files.length} files is below the minimum of ${MIN_SUPPORT_CORPUS_FILES}.`,
  );
  process.exit(1);
}

const outputPath = path.join(repoRoot, SUPPORT_CORPUS_SNAPSHOT);
await writeFile(outputPath, json);
console.log(`[support-corpus] wrote ${SUPPORT_CORPUS_SNAPSHOT}`);
