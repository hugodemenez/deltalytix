import { Suspense } from "react"
import { connection } from "next/server"
import { redirect } from "next/navigation"
import { headers } from "next/headers"
import { loadAuthorizeContext } from "./actions"
import { AuthorizeConsent } from "./consent"
import { API_SCOPE_DESCRIPTIONS, type ApiScope } from "@/lib/api/scopes"

export default function OAuthAuthorizePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  return (
    <Suspense
      fallback={
        <main className="min-h-screen bg-zinc-50 text-zinc-900 flex items-center justify-center p-6" />
      }
    >
      <AuthorizeRequest searchParams={searchParams} />
    </Suspense>
  )
}

async function AuthorizeRequest({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  await connection()

  const params = await searchParams
  const get = (key: string) => {
    const value = params[key]
    return Array.isArray(value) ? value[0] : value
  }

  const clientId = get("client_id") || ""
  const redirectUri = get("redirect_uri") || ""
  const responseType = get("response_type") || ""
  const scope = get("scope") || ""
  const state = get("state")
  const codeChallenge = get("code_challenge")
  const codeChallengeMethod = get("code_challenge_method")

  const headerList = await headers()
  const host = headerList.get("x-forwarded-host") || headerList.get("host") || "localhost:3000"
  const proto = headerList.get("x-forwarded-proto") || "http"
  const currentUrl = `${proto}://${host}/oauth/authorize?${new URLSearchParams(
    Object.entries({
      client_id: clientId,
      redirect_uri: redirectUri,
      response_type: responseType,
      scope,
      ...(state ? { state } : {}),
      ...(codeChallenge ? { code_challenge: codeChallenge } : {}),
      ...(codeChallengeMethod
        ? { code_challenge_method: codeChallengeMethod }
        : {}),
    }).filter(([, v]) => Boolean(v)) as [string, string][],
  ).toString()}`

  const context = await loadAuthorizeContext({
    clientId,
    redirectUri,
    responseType,
    scope,
    state,
    codeChallenge,
    codeChallengeMethod,
  })

  if (!context.authenticated) {
    redirect(`/authentication?next=${encodeURIComponent(currentUrl)}`)
  }

  if ("error" in context && context.error) {
    return (
      <main className="min-h-screen bg-zinc-50 text-zinc-900 flex items-center justify-center p-6">
        <div className="max-w-md w-full rounded-xl border border-zinc-200 bg-white p-6 shadow-sm">
          <h1 className="text-xl font-semibold tracking-tight">Authorization error</h1>
          <p className="mt-2 text-sm text-zinc-600">{context.message}</p>
          <p className="mt-4 text-xs font-mono text-zinc-500">{context.error}</p>
        </div>
      </main>
    )
  }

  if (!("app" in context) || !context.app) {
    return null
  }

  const scopeItems = context.scopes.map((s) => ({
    id: s,
    description: API_SCOPE_DESCRIPTIONS[s as ApiScope] || s,
  }))

  return (
    <AuthorizeConsent
      app={context.app}
      scopes={scopeItems}
      redirectUri={context.redirectUri}
      state={context.state}
      codeChallenge={context.codeChallenge}
      codeChallengeMethod={context.codeChallengeMethod}
      scopeValue={context.scopes.join(" ")}
    />
  )
}
