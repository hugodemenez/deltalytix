import { randomBytes } from "node:crypto"
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest"
import { NextRequest } from "next/server"
import { API_SCOPES } from "@/lib/api/scopes"
import { sha256 } from "@/lib/api/tokens"
import { MCP_TOOLS } from "@/lib/mcp/catalog"

vi.mock("next/server", async (importOriginal) => {
  const actual = await importOriginal<typeof import("next/server")>()
  return {
    ...actual,
    after: (task: () => unknown) => {
      void Promise.resolve()
        .then(task)
        .catch(() => undefined)
    },
  }
})

import { POST } from "@/app/api/mcp/route"
import { prisma } from "@/lib/prisma"

const READ_SCOPES = API_SCOPES.filter((scope) => scope.endsWith(":read"))

/**
 * Writes two users into Postgres. Skipped unless DATABASE_URL is a local
 * server, so a cloud-injected remote URL cannot receive these rows.
 */
const localDatabase = /@(localhost|127\.0\.0\.1)(?::\d+)?\//.test(
  process.env.DATABASE_URL ?? "",
)

type Tenant = {
  id: string
  email: string
  accountId: string
  accountNumber: string
  tradeId: string
  instrument: string
  connectionId: string
  externalId: string
  brokerSecret: string
  groupName: string
  pat: string
  oauth: string
}

const suffix = randomBytes(4).toString("hex")
const tenants: Record<"a" | "b", Tenant> = {
  a: tenant("a"),
  b: tenant("b"),
}
const userIds = [tenants.a.id, tenants.b.id]

function tenant(label: "a" | "b"): Tenant {
  const tag = `${label}-${suffix}`
  return {
    id: `mcp-tenant-${tag}`,
    email: `mcp-tenant-${tag}@deltalytix.test`,
    accountId: `acct-id-${tag}`,
    accountNumber: `ACCT-${tag}`,
    tradeId: `trade-${tag}`,
    instrument: `SYM${label.toUpperCase()}${suffix}`,
    connectionId: `conn-${tag}`,
    externalId: `ext-${tag}`,
    brokerSecret: `broker-secret-${tag}`,
    groupName: `group-${tag}`,
    pat: `dltx_pat_mcp_${tag}`,
    oauth: `dltx_at_mcp_${tag}`,
  }
}

function markers(tenant: Tenant): string[] {
  return [
    tenant.id,
    tenant.email,
    tenant.accountId,
    tenant.accountNumber,
    tenant.tradeId,
    tenant.instrument,
    tenant.connectionId,
    tenant.externalId,
    tenant.brokerSecret,
    tenant.groupName,
  ]
}

async function mcp(token: string | undefined, method: string, params: unknown) {
  const headers: Record<string, string> = {
    "content-type": "application/json",
    accept: "application/json, text/event-stream",
    "mcp-protocol-version": "2025-06-18",
    host: "www.deltalytix.app",
  }
  if (token) headers.authorization = `Bearer ${token}`
  const response = await POST(
    new NextRequest("https://www.deltalytix.app/api/mcp", {
      method: "POST",
      headers,
      body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }),
    }),
  )
  return { status: response.status, body: await response.json() }
}

async function callTool(token: string, name: string, args: Record<string, unknown>) {
  const result = await mcp(token, "tools/call", { name, arguments: args })
  const text = String(result.body?.result?.content?.[0]?.text ?? JSON.stringify(result.body))
  return {
    ...result,
    text,
    isError: Boolean(result.body?.result?.isError),
  }
}

describe.skipIf(!localDatabase)("MCP cross-tenant isolation", () => {
  beforeAll(async () => {
    await prisma.trade.deleteMany({ where: { userId: { in: userIds } } })
    await prisma.user.deleteMany({ where: { id: { in: userIds } } })

    for (const tenant of [tenants.a, tenants.b]) {
      await prisma.user.create({
        data: {
          id: tenant.id,
          email: tenant.email,
          auth_user_id: `auth-${tenant.id}`,
          language: tenant === tenants.a ? "en" : "fr",
        },
      })
      await prisma.group.create({
        data: { name: tenant.groupName, userId: tenant.id },
      })
      await prisma.connection.create({
        data: {
          id: tenant.connectionId,
          userId: tenant.id,
          service: "tradovate",
          externalId: tenant.externalId,
          token: tenant.brokerSecret,
          lastSyncedAt: new Date("2026-04-01T00:00:00.000Z"),
        },
      })
    }

    // A's account sits in B's group. B's account sits on A's connection.
    // Both are foreign keys the read path must not follow across tenants.
    const groupB = await prisma.group.findFirstOrThrow({
      where: { userId: tenants.b.id, name: tenants.b.groupName },
    })
    await prisma.account.create({
      data: {
        id: tenants.a.accountId,
        number: tenants.a.accountNumber,
        userId: tenants.a.id,
        groupId: groupB.id,
        connectionId: tenants.a.connectionId,
        startingBalance: 50000,
      },
    })
    await prisma.account.create({
      data: {
        id: tenants.b.accountId,
        number: tenants.b.accountNumber,
        userId: tenants.b.id,
        connectionId: tenants.a.connectionId,
        startingBalance: 100000,
      },
    })

    for (const tenant of [tenants.a, tenants.b]) {
      await prisma.trade.create({
        data: {
          id: tenant.tradeId,
          userId: tenant.id,
          accountNumber: tenant.accountNumber,
          accountId: tenant.accountId,
          instrument: tenant.instrument,
          quantity: 1,
          entryPrice: "5000",
          closePrice: "5010",
          entryDate: "2026-04-02T14:00:00.000Z",
          closeDate: "2026-04-02T14:05:00.000Z",
          pnl: tenant === tenants.a ? 100 : -40,
          side: "long",
          comment: `note-${tenant.id}`,
        },
      })
      const app = await prisma.oAuthApp.create({
        data: {
          userId: tenant.id,
          name: `MCP ${tenant.id}`,
          clientId: `dltx_app_${tenant.id}`,
          clientSecretHash: sha256(`secret-${tenant.id}`),
          redirectUris: ["https://example.com/callback"],
          scopes: [...API_SCOPES],
        },
      })
      await prisma.oAuthAccessToken.createMany({
        data: [
          {
            name: "pat",
            tokenHash: sha256(tenant.pat),
            userId: tenant.id,
            scopes: [...READ_SCOPES],
            expiresAt: null,
          },
          {
            name: "oauth",
            tokenHash: sha256(tenant.oauth),
            appId: app.id,
            userId: tenant.id,
            scopes: [...READ_SCOPES],
            expiresAt: new Date(Date.now() + 60 * 60 * 1000),
          },
          {
            name: "revoked",
            tokenHash: sha256(`${tenant.pat}-revoked`),
            userId: tenant.id,
            scopes: [...READ_SCOPES],
            revokedAt: new Date(),
            expiresAt: null,
          },
          {
            name: "expired",
            tokenHash: sha256(`${tenant.pat}-expired`),
            userId: tenant.id,
            scopes: [...READ_SCOPES],
            expiresAt: new Date(Date.now() - 60_000),
          },
          {
            name: "noscope",
            tokenHash: sha256(`${tenant.pat}-noscope`),
            userId: tenant.id,
            scopes: [],
            expiresAt: null,
          },
        ],
      })
    }
  })

  afterAll(async () => {
    await prisma.trade.deleteMany({ where: { userId: { in: userIds } } })
    await prisma.user.deleteMany({ where: { id: { in: userIds } } })
    await prisma.$disconnect()
  })

  const cases: {
    name: string
    args: (self: Tenant, other: Tenant) => Record<string, unknown>[]
    expectsOwn: (self: Tenant) => string
  }[] = [
    {
      name: "get_profile",
      args: () => [{}],
      expectsOwn: (self) => self.email,
    },
    {
      name: "list_accounts",
      args: (_self, other) => [
        {},
        { includeMetrics: true },
        { accountId: other.accountId },
        { accountNumber: other.accountNumber },
      ],
      expectsOwn: (self) => self.accountNumber,
    },
    {
      name: "list_trades",
      args: (_self, other) => [
        {},
        { accountNumber: other.accountNumber },
        { accountNumber: other.accountId },
        { instrument: other.instrument },
        { from: "2026-04-02", to: "2026-04-02" },
      ],
      expectsOwn: (self) => self.instrument,
    },
    {
      name: "get_metrics_summary",
      args: (_self, other) => [
        {},
        { accountNumber: other.accountNumber },
        { instrument: other.instrument },
      ],
      expectsOwn: () => "tradeCount",
    },
    {
      name: "get_account_metrics",
      args: (_self, other) => [{}, { accountId: other.accountId }],
      expectsOwn: (self) => self.accountNumber,
    },
    {
      name: "get_equity_curve",
      args: (_self, other) => [
        {},
        { accountNumbers: [other.accountNumber] },
        { accountNumbers: [other.accountNumber, other.accountId] },
      ],
      expectsOwn: (self) => self.accountNumber,
    },
    {
      name: "get_daily_pnl",
      args: (_self, other) => [
        {},
        { accountNumbers: [other.accountNumber] },
      ],
      expectsOwn: () => "dailyPnL",
    },
    {
      name: "list_connections",
      args: (_self, other) => [{}, { id: other.connectionId }, { connectionId: other.connectionId }],
      expectsOwn: (self) => self.externalId,
    },
  ]

  it("covers every MCP tool", () => {
    expect(cases.map((entry) => entry.name).sort()).toEqual(
      MCP_TOOLS.map((tool) => tool.name).sort(),
    )
  })

  it.each(["a", "b"] as const)(
    "user %s PAT and OAuth tokens never return the other user's rows",
    async (label) => {
      const self = tenants[label]
      const other = label === "a" ? tenants.b : tenants.a
      const forbidden = markers(other)

      for (const token of [self.pat, self.oauth]) {
        for (const tool of cases) {
          for (const args of tool.args(self, other)) {
            const result = await callTool(token, tool.name, args)
            expect(result.status, `${tool.name} ${JSON.stringify(args)}`).toBe(200)
            for (const marker of forbidden) {
              expect(result.text, `${tool.name} leaked ${marker}`).not.toContain(marker)
            }
          }
          const own = await callTool(token, tool.name, {})
          expect(own.isError, tool.name).toBe(false)
          expect(own.text).toContain(tool.expectsOwn(self))
        }
      }
    },
  )

  it("rejects revoked and expired tokens before returning either user's data", async () => {
    const forbidden = [...markers(tenants.a), ...markers(tenants.b)]
    for (const suffix of ["revoked", "expired"] as const) {
      const result = await mcp(tenants.a.pat + `-${suffix}`, "tools/call", {
        name: "list_trades",
        arguments: { accountNumber: tenants.b.accountNumber },
      })
      expect(result.status).toBe(401)
      const text = JSON.stringify(result.body)
      for (const marker of forbidden) {
        expect(text).not.toContain(marker)
      }
    }
  })

  it("rejects a token with no scopes on every tool and does not return data", async () => {
    const token = `${tenants.a.pat}-noscope`
    const forbidden = markers(tenants.b)
    for (const tool of MCP_TOOLS) {
      const result = await callTool(token, tool.name, {})
      expect(result.status).toBe(200)
      expect(result.isError, tool.name).toBe(true)
      expect(result.text).toContain(tool.scope)
      expect(result.text).toContain("No data was read")
      for (const marker of forbidden) {
        expect(result.text).not.toContain(marker)
      }
    }
  })
})
