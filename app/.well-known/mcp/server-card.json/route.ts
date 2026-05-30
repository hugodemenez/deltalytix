import { NextResponse, type NextRequest } from "next/server";
import { absoluteUrl, SITE_NAME } from "@/lib/agent-discovery/metadata";

export function GET(request: NextRequest) {
  return NextResponse.json({
    serverInfo: {
      name: SITE_NAME,
      version: "0.3",
    },
    transports: [
      {
        type: "webmcp",
        endpoint: absoluteUrl("/", request),
      },
    ],
    capabilities: {
      tools: {
        listChanged: false,
        tools: [
          {
            name: "deltalytix.discover_resources",
            description: "Return public Deltalytix discovery resources for agents.",
          },
          {
            name: "deltalytix.navigate",
            description: "Navigate to a public Deltalytix page.",
          },
        ],
      },
      resources: {
        subscribe: false,
        listChanged: false,
      },
      prompts: {
        listChanged: false,
      },
    },
  });
}
