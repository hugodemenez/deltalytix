import type { Implementation } from "@modelcontextprotocol/sdk/types.js"
import type { NextRequest } from "next/server"
import { absoluteUrl } from "@/lib/agent-discovery/metadata"
import { MCP_SERVER_NAME, MCP_SERVER_VERSION } from "@/lib/mcp/catalog"

/**
 * Existing site marks. PNG is listed first so a client that renders a single
 * icon, or that skips SVG, still shows the Deltalytix tile. Paths are stable
 * public URLs (`app/icon.svg` is served at `/icon.svg`).
 */
const MCP_SERVER_ICONS = [
  {
    path: "/android-chrome-512x512.png",
    mimeType: "image/png",
    sizes: ["512x512"],
  },
  {
    path: "/apple-touch-icon.png",
    mimeType: "image/png",
    sizes: ["180x180"],
  },
  {
    path: "/icon.svg",
    mimeType: "image/svg+xml",
    sizes: ["any"],
  },
] as const

/**
 * `initialize` serverInfo and the server card share this object so beta and
 * production each advertise icons on the host that served the request.
 */
export function buildMcpServerInfo(request?: NextRequest | Request): Implementation {
  return {
    name: MCP_SERVER_NAME,
    title: MCP_SERVER_NAME,
    version: MCP_SERVER_VERSION,
    websiteUrl: absoluteUrl("/", request),
    icons: MCP_SERVER_ICONS.map((icon) => ({
      src: absoluteUrl(icon.path, request),
      mimeType: icon.mimeType,
      sizes: [...icon.sizes],
    })),
  }
}
