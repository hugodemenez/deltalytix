import { Suspense } from "react"
import { connection } from "next/server"
import { redirect } from "next/navigation"
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
        <main className="min-h-screen bg-[#FAFAFA]" />
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

  // Relative and without a leading slash, like `next=dashboard`: the sign-in
  // form only follows same-origin targets (`signupRedirectPath`), so an
  // absolute URL built from forwarded headers would drop the user on the
  // dashboard instead of bringing them back to this consent screen.
  const nextTarget = `oauth/authorize?${new URLSearchParams(
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
    redirect(`/authentication?next=${encodeURIComponent(nextTarget)}`)
  }

  if ("error" in context && context.error) {
    return (
      <main className="flex min-h-screen flex-col items-center bg-[#FAFAFA] px-4 py-14 text-[#171717]">
        <p className="mb-6 text-[15px] font-semibold tracking-tight">Deltalytix</p>
        <div className="w-full max-w-[420px] rounded-[4px] border border-[#E5E5E5] bg-white px-6 py-6">
          <h1 className="text-lg font-semibold leading-6 tracking-tight">Authorization error</h1>
          <p className="mt-2 text-sm text-[#686D67]">{context.message}</p>
          <p className="mt-4 font-mono text-xs text-[#686D67]">{context.error}</p>
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
      email={"email" in context ? context.email : ""}
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
