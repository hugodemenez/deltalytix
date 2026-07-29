import { loadSkill } from "./load-skill";

const skill = loadSkill("changelog-review");

export const changelogReviewSkillMarkdown = skill.markdown;
export const changelogReviewSkillDigest = skill.digest;
