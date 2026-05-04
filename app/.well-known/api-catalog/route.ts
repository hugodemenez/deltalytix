import { NextRequest, NextResponse } from "next/server";
import { absoluteUrl } from "@/lib/agent-discovery/metadata";

export function GET(request: NextRequest) {
  return NextResponse.json(
    {
      linkset: [
        {
          anchor: absoluteUrl("/api", request),
          "service-desc": [
            {
              href: absoluteUrl("/openapi.json", request),
              type: "application/vnd.oai.openapi+json",
            },
          ],
          "service-doc": [
            {
              href: absoluteUrl("/docs/api", request),
              type: "text/html",
            },
          ],
          status: [
            {
              href: absoluteUrl("/api", request),
              type: "application/json",
            },
          ],
        },
      ],
    },
    {
      headers: {
        "Content-Type": "application/linkset+json",
      },
    },
  );
}
