import { loadSkill } from "./load-skill";

const skill = loadSkill("changelog-entries");

export const changelogEntriesSkillMarkdown = skill.markdown;
export const changelogEntriesSkillDigest = skill.digest;
