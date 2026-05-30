import { NextRequest, NextResponse } from "next/server";
import {
  absoluteUrl,
  deltalytixSkillDigest,
} from "@/lib/agent-discovery/metadata";

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
    ],
  });
}
