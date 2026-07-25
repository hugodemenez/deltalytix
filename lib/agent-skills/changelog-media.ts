import { loadSkill } from "./load-skill";

const skill = loadSkill("changelog-media");

export const changelogMediaSkillMarkdown = skill.markdown;
export const changelogMediaSkillDigest = skill.digest;
