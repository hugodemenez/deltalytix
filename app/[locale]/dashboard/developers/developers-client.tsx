'use client'

import { useState, useTransition } from 'react'
import { toast } from 'sonner'
import { useI18n } from '@/locales/client'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import {
  createOAuthAppAction,
  createPersonalAccessTokenAction,
  deleteOAuthAppAction,
  revokePersonalAccessTokenAction,
} from './actions'
import type { ApiScope } from '@/lib/api/scopes'

type AppRow = {
  id: string
  name: string
  description: string | null
  clientId: string
  redirectUris: string[]
  scopes: string[]
  createdAt: string
  updatedAt: string
}

type TokenRow = {
  id: string
  name: string | null
  scopes: string[]
  createdAt: string
  lastUsedAt: string | null
  revokedAt: string | null
}

type Props = {
  initialApps: AppRow[]
  initialTokens: TokenRow[]
  scopes: ApiScope[]
  scopeDescriptions: Record<ApiScope, string>
}

export default function DevelopersClient({
  initialApps,
  initialTokens,
  scopes,
  scopeDescriptions,
}: Props) {
  const t = useI18n()
  const [apps, setApps] = useState(initialApps)
  const [tokens, setTokens] = useState(initialTokens)
  const [pending, startTransition] = useTransition()

  const [appName, setAppName] = useState('')
  const [appDescription, setAppDescription] = useState('')
  const [redirectUris, setRedirectUris] = useState('http://localhost:3000/callback')
  const [appScopes, setAppScopes] = useState<string[]>([...scopes])
  const [createdSecret, setCreatedSecret] = useState<{ clientId: string; clientSecret: string } | null>(null)

  const [tokenName, setTokenName] = useState('')
  const [tokenScopes, setTokenScopes] = useState<string[]>([...scopes])
  const [createdPat, setCreatedPat] = useState<string | null>(null)

  function toggleScope(list: string[], setList: (v: string[]) => void, scope: string) {
    setList(
      list.includes(scope) ? list.filter((s) => s !== scope) : [...list, scope],
    )
  }

  function createApp() {
    startTransition(async () => {
      try {
        const result = await createOAuthAppAction({
          name: appName,
          description: appDescription,
          redirectUris: redirectUris.split('\n'),
          scopes: appScopes,
        })
        setCreatedSecret({
          clientId: result.clientId,
          clientSecret: result.clientSecret,
        })
        setAppName('')
        setAppDescription('')
        const refreshed = await fetchApps()
        setApps(refreshed)
        toast.success(t('apiAccess.apps.created'))
      } catch (error) {
        toast.error(error instanceof Error ? error.message : t('apiAccess.apps.createFailed'))
      }
    })
  }

  function createToken() {
    startTransition(async () => {
      try {
        const result = await createPersonalAccessTokenAction({
          name: tokenName,
          scopes: tokenScopes,
        })
        setCreatedPat(result.token)
        setTokenName('')
        const refreshed = await fetchTokens()
        setTokens(refreshed)
        toast.success(t('apiAccess.tokens.created'))
      } catch (error) {
        toast.error(error instanceof Error ? error.message : t('apiAccess.tokens.createFailed'))
      }
    })
  }

  async function fetchApps(): Promise<AppRow[]> {
    const { listOAuthAppsAction } = await import('./actions')
    const rows = await listOAuthAppsAction()
    return rows.map((app) => ({
      ...app,
      createdAt: app.createdAt.toISOString(),
      updatedAt: app.updatedAt.toISOString(),
    }))
  }

  async function fetchTokens(): Promise<TokenRow[]> {
    const { listPersonalAccessTokensAction } = await import('./actions')
    const rows = await listPersonalAccessTokensAction()
    return rows.map((token) => ({
      ...token,
      createdAt: token.createdAt.toISOString(),
      lastUsedAt: token.lastUsedAt?.toISOString() ?? null,
      revokedAt: token.revokedAt?.toISOString() ?? null,
    }))
  }

  return (
    <div className="flex w-full min-h-screen py-8">
      <div className="flex flex-1 flex-col w-full gap-8 p-4 max-w-5xl mx-auto">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{t('apiAccess.title')}</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {t('apiAccess.description')}
          </p>
        </div>

        {createdSecret ? (
          <Card className="border-amber-300 bg-amber-50 dark:bg-amber-950/20">
            <CardHeader>
              <CardTitle className="text-base">{t('apiAccess.apps.secretTitle')}</CardTitle>
              <CardDescription>
                {t('apiAccess.apps.secretDescription')}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-2 font-mono text-sm break-all">
              <p>client_id: {createdSecret.clientId}</p>
              <p>client_secret: {createdSecret.clientSecret}</p>
              <Button variant="outline" size="sm" onClick={() => setCreatedSecret(null)}>
                {t('apiAccess.dismiss')}
              </Button>
            </CardContent>
          </Card>
        ) : null}

        {createdPat ? (
          <Card className="border-amber-300 bg-amber-50 dark:bg-amber-950/20">
            <CardHeader>
              <CardTitle className="text-base">{t('apiAccess.tokens.secretTitle')}</CardTitle>
              <CardDescription>
                {t('apiAccess.tokens.secretDescription')}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-2 font-mono text-sm break-all">
              <p>{createdPat}</p>
              <Button variant="outline" size="sm" onClick={() => setCreatedPat(null)}>
                {t('apiAccess.dismiss')}
              </Button>
            </CardContent>
          </Card>
        ) : null}

        <Card>
          <CardHeader>
            <CardTitle>{t('apiAccess.apps.title')}</CardTitle>
            <CardDescription>
              {t('apiAccess.apps.description')}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="app-name">{t('apiAccess.apps.name')}</Label>
                <Input
                  id="app-name"
                  value={appName}
                  onChange={(e) => setAppName(e.target.value)}
                  placeholder={t('apiAccess.apps.namePlaceholder')}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="app-description">{t('apiAccess.apps.descriptionLabel')}</Label>
                <Input
                  id="app-description"
                  value={appDescription}
                  onChange={(e) => setAppDescription(e.target.value)}
                  placeholder={t('apiAccess.apps.descriptionPlaceholder')}
                />
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="redirect-uris">{t('apiAccess.apps.redirectUris')}</Label>
                <Textarea
                  id="redirect-uris"
                  value={redirectUris}
                  onChange={(e) => setRedirectUris(e.target.value)}
                  rows={3}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>{t('apiAccess.apps.allowedScopes')}</Label>
              <div className="grid gap-2 sm:grid-cols-2">
                {scopes.map((scope) => (
                  <label key={scope} className="flex items-start gap-2 text-sm">
                    <Checkbox
                      checked={appScopes.includes(scope)}
                      onCheckedChange={() => toggleScope(appScopes, setAppScopes, scope)}
                    />
                    <span>
                      <span className="font-medium">{scope}</span>
                      <span className="block text-muted-foreground text-xs">
                        {scopeDescriptions[scope]}
                      </span>
                    </span>
                  </label>
                ))}
              </div>
            </div>

            <Button onClick={createApp} disabled={pending || !appName.trim()}>
              {t('apiAccess.apps.create')}
            </Button>

            <Separator />

            <div className="space-y-3">
              {apps.length === 0 ? (
                <p className="text-sm text-muted-foreground">{t('apiAccess.apps.empty')}</p>
              ) : (
                apps.map((app) => (
                  <div
                    key={app.id}
                    className="rounded-lg border p-4 flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between"
                  >
                    <div className="space-y-1">
                      <p className="font-medium">{app.name}</p>
                      <p className="text-xs font-mono text-muted-foreground break-all">
                        {app.clientId}
                      </p>
                      <div className="flex flex-wrap gap-1 pt-1">
                        {app.scopes.map((scope) => (
                          <Badge key={scope} variant="secondary">
                            {scope}
                          </Badge>
                        ))}
                      </div>
                    </div>
                    <Button
                      variant="destructive"
                      size="sm"
                      disabled={pending}
                      onClick={() =>
                        startTransition(async () => {
                          await deleteOAuthAppAction(app.id)
                          setApps((prev) => prev.filter((a) => a.id !== app.id))
                          toast.success(t('apiAccess.apps.deleted'))
                        })
                      }
                    >
                      {t('apiAccess.apps.delete')}
                    </Button>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t('apiAccess.tokens.title')}</CardTitle>
            <CardDescription>
              {t('apiAccess.tokens.description')}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2 max-w-md">
              <Label htmlFor="token-name">{t('apiAccess.tokens.nameLabel')}</Label>
              <Input
                id="token-name"
                value={tokenName}
                onChange={(e) => setTokenName(e.target.value)}
                placeholder={t('apiAccess.tokens.namePlaceholder')}
              />
            </div>

            <div className="space-y-2">
              <Label>{t('apiAccess.scopes')}</Label>
              <div className="grid gap-2 sm:grid-cols-2">
                {scopes.map((scope) => (
                  <label key={scope} className="flex items-start gap-2 text-sm">
                    <Checkbox
                      checked={tokenScopes.includes(scope)}
                      onCheckedChange={() => toggleScope(tokenScopes, setTokenScopes, scope)}
                    />
                    <span>
                      <span className="font-medium">{scope}</span>
                      <span className="block text-muted-foreground text-xs">
                        {scopeDescriptions[scope]}
                      </span>
                    </span>
                  </label>
                ))}
              </div>
            </div>

            <Button onClick={createToken} disabled={pending || !tokenName.trim()}>
              {t('apiAccess.tokens.create')}
            </Button>

            <Separator />

            <div className="space-y-3">
              {tokens.length === 0 ? (
                <p className="text-sm text-muted-foreground">{t('apiAccess.tokens.empty')}</p>
              ) : (
                tokens.map((token) => (
                  <div
                    key={token.id}
                    className="rounded-lg border p-4 flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between"
                  >
                    <div className="space-y-1">
                      <p className="font-medium">{token.name || t('apiAccess.tokens.untitled')}</p>
                      <p className="text-xs text-muted-foreground">
                        {t('apiAccess.tokens.createdAt', {
                          date: new Date(token.createdAt).toLocaleString(),
                        })}
                        {token.revokedAt ? ` · ${t('apiAccess.tokens.revoked')}` : ''}
                      </p>
                      <div className="flex flex-wrap gap-1 pt-1">
                        {token.scopes.map((scope) => (
                          <Badge key={scope} variant="secondary">
                            {scope}
                          </Badge>
                        ))}
                      </div>
                    </div>
                    {!token.revokedAt ? (
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={pending}
                        onClick={() =>
                          startTransition(async () => {
                            await revokePersonalAccessTokenAction(token.id)
                            setTokens((prev) =>
                              prev.map((t) =>
                                t.id === token.id
                                  ? { ...t, revokedAt: new Date().toISOString() }
                                  : t,
                              ),
                            )
                            toast.success(t('apiAccess.tokens.revokedToast'))
                          })
                        }
                      >
                        {t('apiAccess.tokens.revoke')}
                      </Button>
                    ) : (
                      <Badge variant="outline">{t('apiAccess.tokens.revoked')}</Badge>
                    )}
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
