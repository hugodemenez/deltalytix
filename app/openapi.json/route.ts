import { NextResponse, type NextRequest } from "next/server";
import { absoluteUrl } from "@/lib/agent-discovery/metadata";

export const dynamic = "force-dynamic";

export function GET(request: NextRequest) {
  return NextResponse.json(
    {
      openapi: "3.1.0",
      info: {
        title: "Deltalytix API",
        version: "0.3.0",
        description:
          "Public discovery description for Deltalytix trading analytics APIs.",
      },
      servers: [{ url: absoluteUrl("/api", request) }],
      paths: {
        "/api": {
          get: {
            summary: "API status",
            responses: {
              "200": {
                description: "API is reachable",
                content: {
                  "application/json": {
                    schema: {
                      type: "object",
                      properties: {
                        message: { type: "string" },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
    {
      headers: {
        "Content-Type": "application/vnd.oai.openapi+json; charset=utf-8",
      },
    },
  );
}
