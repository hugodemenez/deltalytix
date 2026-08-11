"use client"

import { useCallback, useEffect, useMemo, useState, useTransition } from "react"
import Link from "next/link"
import { useCurrentLocale } from "@/locales/landing-client"
import {
  createDocsPlaygroundTokenAction,
  getDocsPlaygroundAuthAction,
  revokeDocsPlaygroundTokenAction,
} from "@/app/[locale]/(landing)/docs/actions"

const TOKEN_STORAGE_KEY = "deltalytix.docs.playground.token"
const TOKEN_ID_STORAGE_KEY = "deltalytix.docs.playground.tokenId"

/** Mirrors server default read scopes; keep in sync with docs/actions.ts */
const READ_SCOPES = [
  "profile:read",
  "trades:read",
  "accounts:read",
  "connections:read",
  "metrics:read",
] as const

const WRITE_SCOPES = [
  "trades:write",
  "connections:write",
  "imports:write",
] as const

type PresetEndpoint = {
  id: string
  label: string
  method: "GET" | "POST"
  path: string
  body?: string
}

const PRESET_ENDPOINTS: PresetEndpoint[] = [
  {
    id: "me",
    label: "GET /api/v1/me",
    method: "GET",
    path: "/api/v1/me",
  },
  {
    id: "trades",
    label: "GET /api/v1/trades?limit=5",
    method: "GET",
    path: "/api/v1/trades?limit=5",
  },
  {
    id: "accounts",
    label: "GET /api/v1/accounts",
    method: "GET",
    path: "/api/v1/accounts",
  },
  {
    id: "connections",
    label: "GET /api/v1/connections",
    method: "GET",
    path: "/api/v1/connections",
  },
  {
    id: "metrics-summary",
    label: "GET /api/v1/metrics/summary",
    method: "GET",
    path: "/api/v1/metrics/summary",
  },
  {
    id: "metrics-equity",
    label: "GET /api/v1/metrics/equity",
    method: "GET",
    path: "/api/v1/metrics/equity",
  },
  {
    id: "custom",
    label: "Custom request",
    method: "GET",
    path: "/api/v1/me",
  },
]

const COPY = {
  en: {
    title: "API playground",
    description:
      "Call real /api/v1 endpoints with a personal access token. Logged-in visitors can generate a short-lived docs token; everyone can paste an existing PAT.",
    signedInAs: "Signed in as {email}",
    signedIn: "Signed in",
    generateToken: "Generate docs token",
    generating: "Generating…",
    revoke: "Revoke",
    clear: "Clear",
    copy: "Copy",
    copied: "Copied",
    signIn: "Sign in to generate a token",
    signInHint:
      "Or paste a personal access token from Dashboard → Developers.",
    pasteToken: "Bearer token",
    pastePlaceholder: "dltx_pat_…",
    tokenMasked: "Token",
    writeScopes: "Optional write scopes",
    endpoint: "Endpoint",
    method: "Method",
    path: "Path",
    body: "JSON body",
    send: "Send",
    sending: "Sending…",
    response: "Response",
    noToken: "Add a bearer token before sending a request.",
    authError: "Could not check authentication status.",
    tokenError: "Could not create a docs token.",
    customLabel: "Custom request",
  },
  fr: {
    title: "Bac à sable API",
    description:
      "Appelez les vrais endpoints /api/v1 avec un personal access token. Les visiteurs connectés peuvent générer un token docs ; tout le monde peut coller un PAT existant.",
    signedInAs: "Connecté en tant que {email}",
    signedIn: "Connecté",
    generateToken: "Générer un token docs",
    generating: "Génération…",
    revoke: "Révoquer",
    clear: "Effacer",
    copy: "Copier",
    copied: "Copié",
    signIn: "Se connecter pour générer un token",
    signInHint:
      "Ou collez un personal access token depuis Dashboard → Développeurs.",
    pasteToken: "Jeton Bearer",
    pastePlaceholder: "dltx_pat_…",
    tokenMasked: "Jeton",
    writeScopes: "Scopes d’écriture optionnels",
    endpoint: "Endpoint",
    method: "Méthode",
    path: "Chemin",
    body: "Corps JSON",
    send: "Envoyer",
    sending: "Envoi…",
    response: "Réponse",
    noToken: "Ajoutez un jeton bearer avant d’envoyer une requête.",
    authError: "Impossible de vérifier l’authentification.",
    tokenError: "Impossible de créer un token docs.",
    customLabel: "Requête personnalisée",
  },
} as const

function maskToken(token: string): string {
  if (token.length <= 12) return "••••••••"
  return `${token.slice(0, 10)}…${token.slice(-4)}`
}

function safePrettyJson(value: unknown): string {
  try {
    return JSON.stringify(value, null, 2)
  } catch {
    return String(value)
  }
}

function readSessionToken(): { token: string; tokenId: string | null } {
  if (typeof window === "undefined") {
    return { token: "", tokenId: null }
  }
  try {
    return {
      token: sessionStorage.getItem(TOKEN_STORAGE_KEY) ?? "",
      tokenId: sessionStorage.getItem(TOKEN_ID_STORAGE_KEY),
    }
  } catch {
    return { token: "", tokenId: null }
  }
}

function writeSessionToken(token: string, tokenId: string | null) {
  try {
    if (token) {
      sessionStorage.setItem(TOKEN_STORAGE_KEY, token)
    } else {
      sessionStorage.removeItem(TOKEN_STORAGE_KEY)
    }
    if (tokenId) {
      sessionStorage.setItem(TOKEN_ID_STORAGE_KEY, tokenId)
    } else {
      sessionStorage.removeItem(TOKEN_ID_STORAGE_KEY)
    }
  } catch {
    // Ignore storage failures (private mode, etc.)
  }
}

function sanitizeErrorMessage(message: string): string {
  // Avoid echoing bearer tokens or PAT prefixes in UI error text.
  return message.replace(/dltx_pat_[A-Za-z0-9_-]+/g, "dltx_pat_***")
}

export function DocsApiPlayground() {
  const locale = useCurrentLocale()
  const labels = COPY[locale === "fr" ? "fr" : "en"]
  const [pending, startTransition] = useTransition()

  const [authChecked, setAuthChecked] = useState(false)
  const [authenticated, setAuthenticated] = useState(false)
  const [email, setEmail] = useState<string | null>(null)
  const [authError, setAuthError] = useState<string | null>(null)

  const [token, setToken] = useState("")
  const [tokenId, setTokenId] = useState<string | null>(null)
  const [tokenActionError, setTokenActionError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [writeScopes, setWriteScopes] = useState<string[]>([])

  const [presetId, setPresetId] = useState(PRESET_ENDPOINTS[0].id)
  const [method, setMethod] = useState<"GET" | "POST">("GET")
  const [path, setPath] = useState("/api/v1/me")
  const [body, setBody] = useState("{\n  \n}")
  const [sending, setSending] = useState(false)
  const [status, setStatus] = useState<number | null>(null)
  const [responseText, setResponseText] = useState<string>("")
  const [requestError, setRequestError] = useState<string | null>(null)

  const isCustom = presetId === "custom"
  const signInHref = `/${locale}/authentication?next=/${locale}/docs`

  useEffect(() => {
    const stored = readSessionToken()
    if (stored.token) {
      setToken(stored.token)
      setTokenId(stored.tokenId)
    }

    let cancelled = false
    void (async () => {
      try {
        const result = await getDocsPlaygroundAuthAction()
        if (cancelled) return
        setAuthenticated(result.authenticated)
        setEmail(result.email)
      } catch {
        if (!cancelled) {
          setAuthError(labels.authError)
          setAuthenticated(false)
          setEmail(null)
        }
      } finally {
        if (!cancelled) setAuthChecked(true)
      }
    })()

    return () => {
      cancelled = true
    }
  }, [labels.authError])

  const persistToken = useCallback((nextToken: string, nextId: string | null) => {
    setToken(nextToken)
    setTokenId(nextId)
    writeSessionToken(nextToken, nextId)
  }, [])

  const handleGenerateToken = () => {
    setTokenActionError(null)
    startTransition(async () => {
      try {
        const scopes = [...READ_SCOPES, ...writeScopes]
        const result = await createDocsPlaygroundTokenAction(scopes)
        if ("error" in result) {
          setTokenActionError(result.error || labels.tokenError)
          return
        }
        persistToken(result.token, result.id)
      } catch {
        setTokenActionError(labels.tokenError)
      }
    })
  }

  const handleClearToken = () => {
    persistToken("", null)
    setTokenActionError(null)
  }

  const handleRevokeToken = () => {
    const id = tokenId
    setTokenActionError(null)
    startTransition(async () => {
      if (id) {
        try {
          const result = await revokeDocsPlaygroundTokenAction(id)
          if (result && "error" in result) {
            setTokenActionError(result.error)
            return
          }
        } catch {
          // Local clear still proceeds — token may already be gone.
        }
      }
      persistToken("", null)
    })
  }

  const handleCopy = async () => {
    if (!token) return
    try {
      await navigator.clipboard.writeText(token)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 1500)
    } catch {
      // Clipboard may be unavailable.
    }
  }

  const handlePresetChange = (nextId: string) => {
    setPresetId(nextId)
    const preset = PRESET_ENDPOINTS.find((item) => item.id === nextId)
    if (!preset || nextId === "custom") return
    setMethod(preset.method)
    setPath(preset.path)
  }

  const toggleWriteScope = (scope: string) => {
    setWriteScopes((current) =>
      current.includes(scope)
        ? current.filter((value) => value !== scope)
        : [...current, scope],
    )
  }

  const signedInLabel = useMemo(() => {
    if (email) return labels.signedInAs.replace("{email}", email)
    return labels.signedIn
  }, [email, labels.signedIn, labels.signedInAs])

  const handleSend = async () => {
    const bearer = token.trim()
    if (!bearer) {
      setRequestError(labels.noToken)
      return
    }

    setSending(true)
    setRequestError(null)
    setStatus(null)
    setResponseText("")

    try {
      const headers: HeadersInit = {
        Authorization: `Bearer ${bearer}`,
        Accept: "application/json",
      }

      const init: RequestInit = {
        method,
        headers,
      }

      if (method === "POST") {
        headers["Content-Type"] = "application/json"
        init.body = body
      }

      const response = await fetch(path, init)
      setStatus(response.status)

      const contentType = response.headers.get("content-type") ?? ""
      if (contentType.includes("application/json")) {
        const json = await response.json()
        setResponseText(safePrettyJson(json))
      } else {
        const text = await response.text()
        setResponseText(text)
      }
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Request failed"
      setRequestError(sanitizeErrorMessage(message))
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
      <div className="space-y-6">
        <div className="space-y-3">
          <p className="text-sm text-black/60 dark:text-white/60">
            {labels.description}
          </p>
          {!authChecked ? (
            <p className="text-sm text-black/45 dark:text-white/45">…</p>
          ) : authenticated ? (
              <>
                <p className="text-sm text-black/60 dark:text-white/60">
                  {signedInLabel}
                </p>

                <fieldset className="space-y-2">
                  <legend className="text-xs font-medium uppercase tracking-wide text-black/45 dark:text-white/45">
                    {labels.writeScopes}
                  </legend>
                  <div className="flex flex-wrap gap-x-4 gap-y-2">
                    {WRITE_SCOPES.map((scope) => (
                      <label
                        key={scope}
                        className="flex items-center gap-2 font-mono text-xs text-black/70 dark:text-white/70"
                      >
                        <input
                          type="checkbox"
                          checked={writeScopes.includes(scope)}
                          onChange={() => toggleWriteScope(scope)}
                          className="size-3.5 rounded-sm border-black/30"
                        />
                        {scope}
                      </label>
                    ))}
                  </div>
                </fieldset>

                <div className="flex flex-wrap gap-3">
                  <button
                    type="button"
                    onClick={handleGenerateToken}
                    disabled={pending}
                    className="border border-black/15 px-3 py-2 text-sm transition-colors hover:bg-black/[0.03] disabled:opacity-50 dark:border-white/15 dark:hover:bg-white/[0.04]"
                  >
                    {pending ? labels.generating : labels.generateToken}
                  </button>
                  {tokenId ? (
                    <button
                      type="button"
                      onClick={handleRevokeToken}
                      disabled={pending}
                      className="px-3 py-2 text-sm text-black/55 underline-offset-4 hover:underline disabled:opacity-50 dark:text-white/55"
                    >
                      {labels.revoke}
                    </button>
                  ) : null}
                </div>
              </>
            ) : (
              <div className="space-y-2">
                <Link
                  href={signInHref}
                  className="inline-block text-sm underline-offset-4 hover:underline"
                >
                  {labels.signIn}
                </Link>
                <p className="text-sm text-black/55 dark:text-white/55">
                  {labels.signInHint}
                </p>
              </div>
            )}

            {authError ? (
              <p className="text-sm text-rose-700 dark:text-rose-400">
                {authError}
              </p>
            ) : null}
            {tokenActionError ? (
              <p className="text-sm text-rose-700 dark:text-rose-400">
                {sanitizeErrorMessage(tokenActionError)}
              </p>
            ) : null}
          </div>

          <div className="space-y-2">
            <label
              htmlFor="docs-playground-token"
              className="text-xs font-medium uppercase tracking-wide text-black/45 dark:text-white/45"
            >
              {labels.pasteToken}
            </label>
            {token ? (
              <div className="flex flex-wrap items-center gap-3">
                <code className="font-mono text-sm text-black dark:text-white">
                  {maskToken(token)}
                </code>
                <button
                  type="button"
                  onClick={() => void handleCopy()}
                  className="text-sm text-black/55 underline-offset-4 hover:underline dark:text-white/55"
                >
                  {copied ? labels.copied : labels.copy}
                </button>
                <button
                  type="button"
                  onClick={handleClearToken}
                  className="text-sm text-black/55 underline-offset-4 hover:underline dark:text-white/55"
                >
                  {labels.clear}
                </button>
              </div>
            ) : null}
            <textarea
              id="docs-playground-token"
              value={token}
              onChange={(event) => {
                const next = event.target.value.trim()
                persistToken(next, next === token ? tokenId : null)
              }}
              placeholder={labels.pastePlaceholder}
              rows={2}
              spellCheck={false}
              autoComplete="off"
              className="w-full resize-y border border-black/10 bg-transparent px-3 py-2 font-mono text-sm outline-none focus:border-black/30 dark:border-white/10 dark:focus:border-white/30"
            />
          </div>
        </div>

        <div className="space-y-4">
          <div className="space-y-2">
            <label
              htmlFor="docs-playground-endpoint"
              className="text-xs font-medium uppercase tracking-wide text-black/45 dark:text-white/45"
            >
              {labels.endpoint}
            </label>
            <select
              id="docs-playground-endpoint"
              value={presetId}
              onChange={(event) => handlePresetChange(event.target.value)}
              className="w-full border border-black/10 bg-transparent px-3 py-2 text-sm outline-none focus:border-black/30 dark:border-white/10 dark:focus:border-white/30"
            >
              {PRESET_ENDPOINTS.map((preset) => (
                <option key={preset.id} value={preset.id}>
                  {preset.id === "custom" ? labels.customLabel : preset.label}
                </option>
              ))}
            </select>
          </div>

          <div className="grid gap-3 sm:grid-cols-[7rem_minmax(0,1fr)]">
            <div className="space-y-2">
              <label
                htmlFor="docs-playground-method"
                className="text-xs font-medium uppercase tracking-wide text-black/45 dark:text-white/45"
              >
                {labels.method}
              </label>
              <select
                id="docs-playground-method"
                value={method}
                disabled={!isCustom}
                onChange={(event) =>
                  setMethod(event.target.value === "POST" ? "POST" : "GET")
                }
                className="w-full border border-black/10 bg-transparent px-3 py-2 font-mono text-sm outline-none focus:border-black/30 disabled:opacity-60 dark:border-white/10 dark:focus:border-white/30"
              >
                <option value="GET">GET</option>
                <option value="POST">POST</option>
              </select>
            </div>
            <div className="space-y-2">
              <label
                htmlFor="docs-playground-path"
                className="text-xs font-medium uppercase tracking-wide text-black/45 dark:text-white/45"
              >
                {labels.path}
              </label>
              <input
                id="docs-playground-path"
                value={path}
                disabled={!isCustom}
                onChange={(event) => setPath(event.target.value)}
                spellCheck={false}
                className="w-full border border-black/10 bg-transparent px-3 py-2 font-mono text-sm outline-none focus:border-black/30 disabled:opacity-60 dark:border-white/10 dark:focus:border-white/30"
              />
            </div>
          </div>

          {(isCustom && method === "POST") || method === "POST" ? (
            <div className="space-y-2">
              <label
                htmlFor="docs-playground-body"
                className="text-xs font-medium uppercase tracking-wide text-black/45 dark:text-white/45"
              >
                {labels.body}
              </label>
              <textarea
                id="docs-playground-body"
                value={body}
                onChange={(event) => setBody(event.target.value)}
                rows={6}
                spellCheck={false}
                className="w-full resize-y border border-black/10 bg-transparent px-3 py-2 font-mono text-xs outline-none focus:border-black/30 dark:border-white/10 dark:focus:border-white/30"
              />
            </div>
          ) : null}

          <button
            type="button"
            onClick={() => void handleSend()}
            disabled={sending}
            className="border border-black/15 px-4 py-2 text-sm transition-colors hover:bg-black/[0.03] disabled:opacity-50 dark:border-white/15 dark:hover:bg-white/[0.04]"
          >
            {sending ? labels.sending : labels.send}
          </button>

          {requestError ? (
            <p className="text-sm text-rose-700 dark:text-rose-400">
              {requestError}
            </p>
          ) : null}

          {(status !== null || responseText) && (
            <div className="space-y-2">
              <div className="flex items-baseline justify-between gap-3">
                <h3 className="text-xs font-medium uppercase tracking-wide text-black/45 dark:text-white/45">
                  {labels.response}
                </h3>
                {status !== null ? (
                  <span className="font-mono text-xs text-black/55 dark:text-white/55">
                    HTTP {status}
                  </span>
                ) : null}
              </div>
              <pre className="max-h-[28rem] overflow-auto border border-black/10 bg-black/[0.015] p-3 font-mono text-xs leading-relaxed text-black/80 dark:border-white/10 dark:bg-white/[0.02] dark:text-white/80">
                {responseText || "—"}
              </pre>
            </div>
          )}
        </div>
      </div>
  )
}

export default DocsApiPlayground
