import { connection } from "next/server"
import DevelopersClient from "./developers-client"
import {
  listOAuthAppsAction,
  listPersonalAccessTokensAction,
} from "./actions"
import { API_SCOPES, API_SCOPE_DESCRIPTIONS } from "@/lib/api/scopes"

export default async function DevelopersPage() {
  await connection()

  const [apps, tokens] = await Promise.all([
    listOAuthAppsAction(),
    listPersonalAccessTokensAction(),
  ])

  return (
    <DevelopersClient
      initialApps={apps.map((app) => ({
        ...app,
        createdAt: app.createdAt.toISOString(),
        updatedAt: app.updatedAt.toISOString(),
      }))}
      initialTokens={tokens.map((token) => ({
        ...token,
        createdAt: token.createdAt.toISOString(),
        lastUsedAt: token.lastUsedAt?.toISOString() ?? null,
        revokedAt: token.revokedAt?.toISOString() ?? null,
      }))}
      scopes={[...API_SCOPES]}
      scopeDescriptions={API_SCOPE_DESCRIPTIONS}
    />
  )
}
