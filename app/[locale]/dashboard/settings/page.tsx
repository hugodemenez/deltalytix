import { connection } from 'next/server'
import SettingsClient from './settings-client'
import {
  listAuthorizedOAuthAppsAction,
  listOwnedOAuthAppsAction,
  listSettingsPersonalAccessTokensAction,
} from './connections-actions'

/**
 * Authenticated client UI — skip static SSR during `next build`.
 * Without this, Cache Components tries to prerender the large client tree and
 * can exceed Vercel's 60s per-page static-generation budget under load.
 */
export default async function SettingsPage() {
    await connection()

    const [authorizedApps, personalTokens, ownedApps] = await Promise.all([
        listAuthorizedOAuthAppsAction(),
        listSettingsPersonalAccessTokensAction(),
        listOwnedOAuthAppsAction(),
    ])

    return (
        <SettingsClient
            initialAuthorizedApps={authorizedApps.map((app) => ({
                appId: app.appId,
                name: app.name,
                logoUrl: app.logoUrl,
                scopes: app.scopes,
                authorizedAt: app.authorizedAt.toISOString(),
                lastUsedAt: app.lastUsedAt?.toISOString() ?? null,
            }))}
            initialPersonalTokens={personalTokens.map((token) => ({
                id: token.id,
                name: token.name,
                scopes: token.scopes,
                createdAt: token.createdAt.toISOString(),
                lastUsedAt: token.lastUsedAt?.toISOString() ?? null,
            }))}
            ownedAppCount={ownedApps.length}
        />
    )
}
