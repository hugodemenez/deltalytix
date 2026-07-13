import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { createHash } from "crypto";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const skillPath = path.join(__dirname, "changelog-review.md");
export const changelogReviewSkillMarkdown = fs.readFileSync(skillPath, "utf8");

export const changelogReviewSkillDigest = `sha256:${createHash("sha256")
  .update(changelogReviewSkillMarkdown)
  .digest("hex")}`;
