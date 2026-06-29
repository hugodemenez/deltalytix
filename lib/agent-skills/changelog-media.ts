import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { createHash } from "crypto";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const skillPath = path.join(__dirname, "changelog-media.md");
export const changelogMediaSkillMarkdown = fs.readFileSync(skillPath, "utf8");

export const changelogMediaSkillDigest = `sha256:${createHash("sha256")
  .update(changelogMediaSkillMarkdown)
  .digest("hex")}`;
