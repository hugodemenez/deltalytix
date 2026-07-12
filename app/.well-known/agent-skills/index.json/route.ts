import { NextRequest, NextResponse } from "next/server";
import {
  absoluteUrl,
  deltalytixSkillDigest,
} from "@/lib/agent-discovery/metadata";
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
        name: "deltalytix-changelog-entries",
        type: "skill-md",
        description:
          "Write bilingual EN/FR changelog MDX entries for release batches from promotion PRs or beta diffs.",
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
          "Capture localized Playwright screenshots and demo videos for changelog entries and wire them into MDX.",
        url: absoluteUrl(
          "/.well-known/agent-skills/changelog-media/SKILL.md",
          request,
        ),
        digest: changelogMediaSkillDigest,
      },
    ],
  });
}
