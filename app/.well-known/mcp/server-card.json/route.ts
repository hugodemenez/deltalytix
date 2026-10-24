import { NextResponse, type NextRequest } from "next/server";
import { absoluteUrl, SITE_NAME } from "@/lib/agent-discovery/metadata";
import {
  MCP_PATH,
  MCP_RESOURCE_METADATA_PATH,
  MCP_SERVER_VERSION,
  MCP_TOOLS,
  OAUTH_AUTHORIZATION_SERVER_PATH,
} from "@/lib/mcp/catalog";

export function GET(request: NextRequest) {
  const tools = MCP_TOOLS.map((tool) => ({
    name: tool.name,
    title: tool.title,
    description: tool.description,
    scope: tool.scope,
    annotations: {
      readOnlyHint: true,
      destructiveHint: false,
    },
  }));

  return NextResponse.json({
    serverInfo: {
      name: SITE_NAME,
      version: MCP_SERVER_VERSION,
    },
    transports: [
      {
        type: "streamable-http",
        endpoint: absoluteUrl(MCP_PATH, request),
        authentication: {
          type: "oauth2",
          bearerMethods: ["header"],
          resourceMetadata: absoluteUrl(MCP_RESOURCE_METADATA_PATH, request),
          authorizationServerMetadata: absoluteUrl(
            OAUTH_AUTHORIZATION_SERVER_PATH,
            request,
          ),
        },
      },
      {
        type: "webmcp",
        endpoint: absoluteUrl("/", request),
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
    ],
    capabilities: {
      tools: {
        listChanged: false,
        tools,
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
