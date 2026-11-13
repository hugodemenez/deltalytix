/**
 * Write the production support-search snapshot.
 *
 * The support lambda reads this JSON instead of the repo. Tracing `app/` and
 * `lib/` source into the function makes Turbopack follow their imports.
 */
import { writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  SUPPORT_CORPUS_SNAPSHOT,
  collectCorpusSources,
} from "../lib/ai/codebase-index";

const repoRoot = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const files = await collectCorpusSources();
const outputPath = path.join(repoRoot, SUPPORT_CORPUS_SNAPSHOT);
const json = JSON.stringify(files);
await writeFile(outputPath, json);

const megabytes = (Buffer.byteLength(json) / 1024 / 1024).toFixed(2);
console.log(
  `[support-corpus] ${files.length} files, ${megabytes} MB → ${SUPPORT_CORPUS_SNAPSHOT}`,
);
