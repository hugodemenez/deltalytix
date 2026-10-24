import http from "node:http"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { NextRequest } from "next/server"
import { Client } from "@modelcontextprotocol/sdk/client/index.js"
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js"
import { sha256 } from "@/lib/api/tokens"
import { MCP_TOOLS, mcpToolScopes } from "@/lib/mcp/catalog"

const { findUnique, update, accountFindMany, tradeFindMany, afterMock } = vi.hoisted(
  () => ({
    findUnique: vi.fn(),
    update: vi.fn(),
    accountFindMany: vi.fn(),
    tradeFindMany: vi.fn(),
    afterMock: vi.fn(),
  }),
)

vi.mock("next/server", async (importOriginal) => {
  const actual = await importOriginal<typeof import("next/server")>()
  return { ...actual, after: afterMock }
})

vi.mock("@/lib/prisma", () => ({
  prisma: {
    oAuthAccessToken: { findUnique, update },
    account: { findMany: accountFindMany },
    trade: { findMany: tradeFindMany },
    user: { findFirst: vi.fn() },
    group: { findMany: vi.fn() },
    connection: { findMany: vi.fn() },
  },
}))

import { GET, OPTIONS, POST } from "./route"
import { GET as serverCard } from "@/app/.well-known/mcp/server-card.json/route"
import { GET as authorizationServer } from "@/app/.well-known/oauth-authorization-server/route"
import { GET as mcpResource } from "@/app/.well-known/oauth-protected-resource/api/mcp/route"

const TOKEN = "dltx_pat_user_a"

function tokenRecord(
  overrides: Partial<{
    userId: string
    scopes: string[]
    revokedAt: Date | null
    expiresAt: Date | null
  }> = {},
) {
  return {
    id: "tok_a",
    userId: "user_a",
    name: "Claude",
    appId: null,
    scopes: [
      "profile:read",
      "accounts:read",
      "trades:read",
      "metrics:read",
      "connections:read",
    ],
    revokedAt: null,
    expiresAt: null,
    tokenHash: sha256(TOKEN),
    app: null,
    ...overrides,
  }
}

function accountRow(number: string) {
  return {
    id: `acc-${number}`,
    number,
    propfirm: "Topstep",
    startingBalance: 50000,
    createdAt: new Date("2026-01-02T00:00:00.000Z"),
    group: null,
    payouts: [],
  }
}

async function mcp(
  method: string,
  params: unknown,
  token?: string,
  id = 1,
) {
  const headers: Record<string, string> = {
    "content-type": "application/json",
    accept: "application/json, text/event-stream",
    "mcp-protocol-version": "2025-06-18",
  }
  if (token) headers.authorization = `Bearer ${token}`

  const response = await POST(
    new NextRequest("https://www.deltalytix.app/api/mcp", {
      method: "POST",
      headers: { ...headers, host: "www.deltalytix.app" },
      body: JSON.stringify({ jsonrpc: "2.0", id, method, params }),
    }),
  )
  return { response, body: await response.json() }
}

describe("MCP endpoint auth", () => {
  beforeEach(() => {
    findUnique.mockReset()
    update.mockReset().mockResolvedValue({})
    accountFindMany.mockReset()
    tradeFindMany.mockReset()
    afterMock.mockReset()
  })

  it("rejects a missing bearer token with the MCP resource metadata", async () => {
    const { response, body } = await mcp("initialize", {
      protocolVersion: "2025-06-18",
      capabilities: {},
      clientInfo: { name: "vitest", version: "0.0.1" },
    })

    expect(response.status).toBe(401)
    expect(body.error.code).toBe("unauthorized")
    const challenge = response.headers.get("WWW-Authenticate") ?? ""
    expect(challenge).toContain('realm="mcp"')
    expect(challenge).toContain(
      'resource_metadata="https://www.deltalytix.app/.well-known/oauth-protected-resource/api/mcp"',
    )
    expect(challenge).toContain("accounts:read")
    expect(findUnique).not.toHaveBeenCalled()
    expect(accountFindMany).not.toHaveBeenCalled()
  })

  it("rejects a revoked token before any tool can read data", async () => {
    findUnique.mockResolvedValue(tokenRecord({ revokedAt: new Date() }))

    const { response } = await mcp(
      "tools/call",
      { name: "list_accounts", arguments: {} },
      TOKEN,
    )

    expect(response.status).toBe(401)
    expect(accountFindMany).not.toHaveBeenCalled()
  })

  it("answers CORS preflight without a token", async () => {
    const response = await OPTIONS(
      new NextRequest("https://www.deltalytix.app/api/mcp", {
        method: "OPTIONS",
        headers: { host: "www.deltalytix.app" },
      }),
    )

    expect(response.status).toBe(204)
    expect(response.headers.get("Access-Control-Allow-Origin")).toBe("*")
    expect(response.headers.get("Access-Control-Expose-Headers")).toContain(
      "WWW-Authenticate",
    )
  })

  it("does not open an SSE stream on GET", async () => {
    findUnique.mockResolvedValue(tokenRecord())

    const response = await GET(
      new NextRequest("https://www.deltalytix.app/api/mcp", {
        method: "GET",
        headers: {
          authorization: `Bearer ${TOKEN}`,
          host: "www.deltalytix.app",
        },
      }),
    )

    expect(response.status).toBe(405)
    expect(response.headers.get("Allow")).toContain("POST")
  })
})

describe("MCP tool calls", () => {
  beforeEach(() => {
    findUnique.mockReset().mockResolvedValue(tokenRecord())
    update.mockReset().mockResolvedValue({})
    accountFindMany.mockReset()
    tradeFindMany.mockReset().mockResolvedValue([])
    afterMock.mockReset()
  })

  it("initializes and lists the read-only tools", async () => {
    const initialized = await mcp(
      "initialize",
      {
        protocolVersion: "2025-06-18",
        capabilities: {},
        clientInfo: { name: "vitest", version: "0.0.1" },
      },
      TOKEN,
    )

    expect(initialized.response.status).toBe(200)
    expect(initialized.body.result.serverInfo).toMatchObject({
      name: "Deltalytix",
      version: "1.0.0",
    })
    expect(initialized.body.result.protocolVersion).toBe("2025-06-18")

    const listed = await mcp("tools/list", {}, TOKEN, 2)
    const names = listed.body.result.tools.map((tool: { name: string }) => tool.name)

    expect(names).toEqual(MCP_TOOLS.map((tool) => tool.name))
    for (const tool of listed.body.result.tools) {
      expect(tool.annotations.readOnlyHint).toBe(true)
    }
  })

  it("returns only the authenticated user's accounts", async () => {
    accountFindMany.mockImplementation(async (args: { where: { userId: string } }) => {
      expect(args.where).toEqual({ userId: "user_a" })
      return [accountRow("A-1")]
    })

    const { response, body } = await mcp(
      "tools/call",
      { name: "list_accounts", arguments: {} },
      TOKEN,
    )

    expect(response.status).toBe(200)
    expect(body.result.isError).toBeUndefined()
    const payload = JSON.parse(body.result.content[0].text) as {
      data: { number: string }[]
    }
    expect(payload.data.map((account) => account.number)).toEqual(["A-1"])
    expect(body.result.content[0].text).not.toContain("B-1")
    expect(accountFindMany).toHaveBeenCalledTimes(1)
  })

  it("refuses a caller-supplied user id and does not query", async () => {
    const { body } = await mcp(
      "tools/call",
      { name: "list_accounts", arguments: { userId: "user_b" } },
      TOKEN,
    )

    expect(body.result.isError).toBe(true)
    expect(String(body.result.content[0].text)).toContain("userId")
    expect(accountFindMany).not.toHaveBeenCalled()
    expect(tradeFindMany).not.toHaveBeenCalled()
  })

  it("does not read another user's trades when the token lacks the scope", async () => {
    findUnique.mockResolvedValue(tokenRecord({ scopes: ["profile:read"] }))

    const { body } = await mcp(
      "tools/call",
      {
        name: "list_trades",
        arguments: { accountNumber: "B-9" },
      },
      TOKEN,
    )

    expect(body.result.isError).toBe(true)
    expect(String(body.result.content[0].text)).toContain("trades:read")
    expect(tradeFindMany).not.toHaveBeenCalled()
  })

  it("queries trades with the token user id, ignoring any attempt to widen the filter", async () => {
    tradeFindMany.mockImplementation(async (args: { where: { userId: string } }) => {
      expect(args.where.userId).toBe("user_a")
      expect(args.where).not.toHaveProperty("userId", "user_b")
      return []
    })

    const { body } = await mcp(
      "tools/call",
      {
        name: "list_trades",
        arguments: { instrument: "ES", limit: 10 },
      },
      TOKEN,
    )

    expect(body.result.isError).toBeUndefined()
    const payload = JSON.parse(body.result.content[0].text) as {
      data: unknown[]
      nextCursor: string | null
    }
    expect(payload.data).toEqual([])
    expect(payload.nextCursor).toBeNull()
    expect(tradeFindMany).toHaveBeenCalledTimes(1)
    expect(tradeFindMany.mock.calls[0][0].where).toMatchObject({
      userId: "user_a",
      instrument: "ES",
    })
  })
})

describe("official SDK client", () => {
  beforeEach(() => {
    findUnique.mockReset().mockResolvedValue(tokenRecord())
    update.mockReset().mockResolvedValue({})
    accountFindMany.mockReset().mockResolvedValue([accountRow("A-1")])
    tradeFindMany.mockReset()
    afterMock.mockReset()
  })

  it("connects over streamable HTTP and calls list_accounts", async () => {
    const server = http.createServer(async (req, res) => {
      const chunks: Buffer[] = []
      for await (const chunk of req) chunks.push(chunk as Buffer)
      const address = server.address()
      const port = typeof address === "object" && address ? address.port : 0
      const headers = new Headers()
      for (const [key, value] of Object.entries(req.headers)) {
        if (value == null) continue
        headers.set(key, Array.isArray(value) ? value.join(", ") : value)
      }
      const hasBody = req.method !== "GET" && req.method !== "HEAD"
      const response = await POST(
        new NextRequest(`http://127.0.0.1:${port}/api/mcp`, {
          method: req.method,
          headers,
          body: hasBody ? Buffer.concat(chunks) : undefined,
        }),
      )
      const bytes = Buffer.from(await response.arrayBuffer())
      const out = new Headers(response.headers)
      out.delete("transfer-encoding")
      res.writeHead(response.status, Object.fromEntries(out))
      res.end(bytes)
    })

    await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve))
    const address = server.address()
    const port = typeof address === "object" && address ? address.port : 0
    const client = new Client({ name: "vitest-sdk", version: "0.0.1" })
    const transport = new StreamableHTTPClientTransport(
      new URL(`http://127.0.0.1:${port}/api/mcp`),
      { requestInit: { headers: { Authorization: `Bearer ${TOKEN}` } } },
    )

    try {
      await client.connect(transport)
      const result = await client.callTool({ name: "list_accounts", arguments: {} })
      const text = (result.content as { type: string; text: string }[])[0]?.text
      expect(JSON.parse(text).data[0].number).toBe("A-1")
      expect(accountFindMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { userId: "user_a" } }),
      )
    } finally {
      await client.close().catch(() => undefined)
      await new Promise<void>((resolve, reject) =>
        server.close((error) => (error ? reject(error) : resolve())),
      )
    }
  })
})

describe("MCP discovery documents", () => {
  it("advertises streamable HTTP and the real tools on the server card", async () => {
    const response = await serverCard(
      new NextRequest("https://www.deltalytix.app/.well-known/mcp/server-card.json", {
        headers: { host: "www.deltalytix.app" },
      }),
    )
    const body = await response.json()

    expect(body.transports[0]).toMatchObject({
      type: "streamable-http",
      endpoint: "https://www.deltalytix.app/api/mcp",
    })
    expect(body.transports[0].authentication.resourceMetadata).toBe(
      "https://www.deltalytix.app/.well-known/oauth-protected-resource/api/mcp",
    )
    expect(body.capabilities.tools.tools.map((tool: { name: string }) => tool.name)).toEqual(
      MCP_TOOLS.map((tool) => tool.name),
    )
  })

  it("points the MCP protected resource at the authorization server and supports PKCE", async () => {
    const request = new NextRequest("https://www.deltalytix.app/api/mcp", {
      headers: { host: "www.deltalytix.app" },
    })
    const resource = await (await mcpResource(request)).json()
    const server = await (await authorizationServer(request)).json()

    expect(resource.resource).toBe("https://www.deltalytix.app/api/mcp")
    expect(resource.authorization_servers).toEqual(["https://www.deltalytix.app"])
    expect(resource.scopes_supported).toEqual(mcpToolScopes())
    expect(resource.scopes_supported).not.toContain("trades:write")
    expect(server.issuer).toBe("https://www.deltalytix.app")
    expect(server.authorization_endpoint).toBe("https://www.deltalytix.app/oauth/authorize")
    expect(server.token_endpoint).toBe("https://www.deltalytix.app/api/oauth/token")
    expect(server.code_challenge_methods_supported).toEqual(["S256"])
    expect(server.registration_endpoint).toBe("https://www.deltalytix.app/oauth/register")
    expect(server.token_endpoint_auth_methods_supported).toContain("none")
    expect(server.authorization_response_iss_parameter_supported).toBe(true)
  })
})
