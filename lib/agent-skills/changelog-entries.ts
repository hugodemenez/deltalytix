import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { createHash } from "crypto";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const skillPath = path.join(__dirname, "changelog-entries.md");
export const changelogEntriesSkillMarkdown = fs.readFileSync(skillPath, "utf8");

export const changelogEntriesSkillDigest = `sha256:${createHash("sha256")
  .update(changelogEntriesSkillMarkdown)
  .digest("hex")}`;
