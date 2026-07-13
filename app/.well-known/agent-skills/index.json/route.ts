import { NextRequest, NextResponse } from "next/server";
import {
  absoluteUrl,
  deltalytixSkillDigest,
} from "@/lib/agent-discovery/metadata";
import { changelogReviewSkillDigest } from "@/lib/agent-skills/changelog-review";
import { changelogEntriesSkillDigest } from "@/lib/agent-skills/changelog-entries";
import { changelogMediaSkillDigest } from "@/lib/agent-skills/changelog-media";

export async function GET(request: NextRequest) {
  return NextResponse.json({
    $schema: "https://schemas.agentskills.io/discovery/0.2.0/schema.json",
    skills: [
      {
        name: "deltalytix-agent-discovery",
        type: "skill-md",
        description:
          "Discover Deltalytix product capabilities, API metadata, authentication metadata, and browser-exposed agent tools.",
        url: absoluteUrl(
          "/.well-known/agent-skills/deltalytix/SKILL.md",
          request,
        ),
        digest: deltalytixSkillDigest,
      },
      {
        name: "deltalytix-changelog-review",
        type: "skill-md",
        description:
          "Review release diffs, group related user-facing changes, and create an editorial changelog outline.",
        url: absoluteUrl(
          "/.well-known/agent-skills/changelog-review/SKILL.md",
          request,
        ),
        digest: changelogReviewSkillDigest,
      },
      {
        name: "deltalytix-changelog-entries",
        type: "skill-md",
        description:
          "Write flexible, outcome-led bilingual EN/FR changelog copy from a reviewed release outline.",
        url: absoluteUrl(
          "/.well-known/agent-skills/changelog-entries/SKILL.md",
          request,
        ),
        digest: changelogEntriesSkillDigest,
      },
      {
        name: "deltalytix-changelog-media",
        type: "skill-md",
        description:
          "Assess whether entries need zero, one, or several visuals, then capture and wire localized changelog media.",
        url: absoluteUrl(
          "/.well-known/agent-skills/changelog-media/SKILL.md",
          request,
        ),
        digest: changelogMediaSkillDigest,
      },
    ],
  });
}
