"use client"

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useId,
  useMemo,
  useState,
  useTransition,
  type ReactNode,
} from "react"
import Link from "next/link"
import { useCurrentLocale } from "@/locales/landing-client"
import {
  createDocsPlaygroundTokenAction,
  getDocsPlaygroundAuthAction,
  revokeDocsPlaygroundTokenAction,
} from "@/app/[locale]/(landing)/docs/actions"
import type {
  DocsOpenApiDocument,
  OpenApiParameter,
} from "@/components/docs/openapi-schema"

const TOKEN_STORAGE_KEY = "deltalytix.docs.playground.token"
const TOKEN_ID_STORAGE_KEY = "deltalytix.docs.playground.tokenId"

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

const COPY = {
  en: {
    description:
      "Use one bearer token across every route try below. Logged-in visitors can generate a docs token; everyone can paste a PAT.",
    signedInAs: "Signed in as {email}",
    signedIn: "Signed in",
    generateToken: "Generate docs token",
    generating: "Generating…",
    revoke: "Revoke",
    clear: "Clear",
    copy: "Copy",
    copied: "Copied",
    show: "Show",
    hide: "Hide",
    signIn: "Sign in to generate a token",
    signInHint:
      "Or paste a personal access token from Dashboard → Developers.",
    pasteToken: "Bearer token",
    pastePlaceholder: "dltx_pat_…",
    writeScopes: "Optional write scopes",
    tryThis: "Try this route",
    method: "Method",
    path: "Path",
    body: "JSON body",
    parameters: "Parameters",
    queryParameters: "Query parameters",
    required: "required",
    send: "Send",
    sending: "Sending…",
    retry: "Retry",
    response: "Response",
    noToken: "Add a bearer token before sending a request.",
    requiredParameter: "Enter a value for {name}.",
    invalidJson: "Enter a valid JSON body before sending.",
    invalidPath:
      "Use a same-origin path beginning with /. Bearer tokens are never sent to another origin.",
    schemaLoading: "Loading the live endpoint definition…",
    schemaError:
      "Could not load this endpoint from the live OpenAPI document.",
    unsupportedRoute:
      "This endpoint is not available in the live OpenAPI document.",
    multipartUnsupported:
      "This multipart upload can’t be tried from this browser panel. Use the documented curl or JavaScript example with your bearer token.",
    formUnsupported:
      "This form-encoded request can’t be tried from this browser panel. Use the documented curl example.",
    authorizeUnsupported:
      "This authorization endpoint requires a browser redirect and user consent, so it can’t be sent as an API request here.",
    authError: "Could not check authentication status.",
    tokenError: "Could not create a docs token.",
    authOptional: "No bearer token required for this route.",
  },
  fr: {
    description:
      "Un seul jeton bearer pour tous les essais ci-dessous. Les visiteurs connectés peuvent générer un token docs ; tout le monde peut coller un PAT.",
    signedInAs: "Connecté en tant que {email}",
    signedIn: "Connecté",
    generateToken: "Générer un token docs",
    generating: "Génération…",
    revoke: "Révoquer",
    clear: "Effacer",
    copy: "Copier",
    copied: "Copié",
    show: "Afficher",
    hide: "Masquer",
    signIn: "Se connecter pour générer un token",
    signInHint:
      "Ou collez un personal access token depuis Dashboard → Développeurs.",
    pasteToken: "Jeton Bearer",
    pastePlaceholder: "dltx_pat_…",
    writeScopes: "Scopes d’écriture optionnels",
    tryThis: "Essayer cette route",
    method: "Méthode",
    path: "Chemin",
    body: "Corps JSON",
    parameters: "Paramètres",
    queryParameters: "Paramètres de requête",
    required: "requis",
    send: "Envoyer",
    sending: "Envoi…",
    retry: "Réessayer",
    response: "Réponse",
    noToken: "Ajoutez un jeton bearer avant d’envoyer une requête.",
    requiredParameter: "Saisissez une valeur pour {name}.",
    invalidJson: "Saisissez un corps JSON valide avant l’envoi.",
    invalidPath:
      "Utilisez un chemin same-origin commençant par /. Les jetons bearer ne sont jamais envoyés vers une autre origine.",
    schemaLoading: "Chargement de la définition live de l’endpoint…",
    schemaError:
      "Impossible de charger cet endpoint depuis le document OpenAPI live.",
    unsupportedRoute:
      "Cet endpoint n’est pas disponible dans le document OpenAPI live.",
    multipartUnsupported:
      "Cet upload multipart ne peut pas être testé depuis ce panneau navigateur. Utilisez l’exemple curl ou JavaScript documenté avec votre jeton bearer.",
    formUnsupported:
      "Cette requête form-encoded ne peut pas être testée depuis ce panneau navigateur. Utilisez l’exemple curl documenté.",
    authorizeUnsupported:
      "Cet endpoint d’autorisation exige une redirection navigateur et le consentement de l’utilisateur ; il ne peut donc pas être envoyé ici comme une requête API.",
    authError: "Impossible de vérifier l’authentification.",
    tokenError: "Impossible de créer un token docs.",
    authOptional: "Aucun jeton bearer requis pour cette route.",
  },
} as const

type PlaygroundCopy = (typeof COPY)[keyof typeof COPY]

type PlaygroundTokenContextValue = {
  token: string
  tokenId: string | null
  labels: PlaygroundCopy
  persistToken: (token: string, tokenId: string | null) => void
  openApiDocument: DocsOpenApiDocument | null
  openApiLoading: boolean
  openApiError: boolean
  reloadOpenApi: () => void
}

const PlaygroundTokenContext =
  createContext<PlaygroundTokenContextValue | null>(null)

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
  return message.replace(/dltx_(?:pat|at|rt|secret)_[A-Za-z0-9_-]+/g, "dltx_***")
}

function usePlaygroundCopy(): PlaygroundCopy {
  const locale = useCurrentLocale()
  return COPY[locale === "fr" ? "fr" : "en"]
}

export function DocsPlaygroundTokenProvider({
  children,
}: {
  children: ReactNode
}) {
  const labels = usePlaygroundCopy()
  const [token, setToken] = useState("")
  const [tokenId, setTokenId] = useState<string | null>(null)
  const [openApiDocument, setOpenApiDocument] =
    useState<DocsOpenApiDocument | null>(null)
  const [openApiLoading, setOpenApiLoading] = useState(true)
  const [openApiError, setOpenApiError] = useState(false)

  useEffect(() => {
    const stored = readSessionToken()
    setToken(stored.token)
    setTokenId(stored.tokenId)
  }, [])

  const reloadOpenApi = useCallback(() => {
    setOpenApiLoading(true)
    setOpenApiError(false)
    void fetch("/openapi.json")
      .then((response) => {
        if (!response.ok) throw new Error(`HTTP ${response.status}`)
        return response.json() as Promise<DocsOpenApiDocument>
      })
      .then((document) => {
        setOpenApiDocument(document)
      })
      .catch(() => {
        setOpenApiDocument(null)
        setOpenApiError(true)
      })
      .finally(() => {
        setOpenApiLoading(false)
      })
  }, [])

  useEffect(() => {
    let cancelled = false
    void fetch("/openapi.json")
      .then((response) => {
        if (!response.ok) throw new Error(`HTTP ${response.status}`)
        return response.json() as Promise<DocsOpenApiDocument>
      })
      .then((document) => {
        if (!cancelled) setOpenApiDocument(document)
      })
      .catch(() => {
        if (!cancelled) {
          setOpenApiDocument(null)
          setOpenApiError(true)
        }
      })
      .finally(() => {
        if (!cancelled) setOpenApiLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [])

  const persistToken = useCallback((nextToken: string, nextId: string | null) => {
    setToken(nextToken)
    setTokenId(nextId)
    writeSessionToken(nextToken, nextId)
  }, [])

  const value = useMemo(
    () => ({
      token,
      tokenId,
      labels,
      persistToken,
      openApiDocument,
      openApiLoading,
      openApiError,
      reloadOpenApi,
    }),
    [
      token,
      tokenId,
      labels,
      persistToken,
      openApiDocument,
      openApiLoading,
      openApiError,
      reloadOpenApi,
    ],
  )

  return (
    <PlaygroundTokenContext.Provider value={value}>
      {children}
    </PlaygroundTokenContext.Provider>
  )
}

function usePlaygroundToken() {
  const context = useContext(PlaygroundTokenContext)
  if (!context) {
    throw new Error(
      "Docs playground components must be used within DocsPlaygroundTokenProvider",
    )
  }
  return context
}

export function useDocsPlayground() {
  return usePlaygroundToken()
}

/**
 * Shared bearer token controls — generate when signed in, or paste a PAT.
 * Input is `type="password"` so the secret stays redacted after paste.
 */
export function DocsBearerTokenPanel() {
  const locale = useCurrentLocale()
  const { token, tokenId, labels, persistToken } = usePlaygroundToken()
  const [pending, startTransition] = useTransition()
  const [authChecked, setAuthChecked] = useState(false)
  const [authenticated, setAuthenticated] = useState(false)
  const [email, setEmail] = useState<string | null>(null)
  const [authError, setAuthError] = useState<string | null>(null)
  const [tokenActionError, setTokenActionError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [writeScopes, setWriteScopes] = useState<string[]>([])
  const [revealed, setRevealed] = useState(false)

  const signInHref = `/${locale}/authentication?next=/${locale}/docs`

  useEffect(() => {
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

  const signedInLabel = useMemo(() => {
    if (email) return labels.signedInAs.replace("{email}", email)
    return labels.signedIn
  }, [email, labels.signedIn, labels.signedInAs])

  const handleGenerateToken = () => {
    setTokenActionError(null)
    setRevealed(false)
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
    setRevealed(false)
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
          // Local clear still proceeds.
        }
      }
      persistToken("", null)
      setRevealed(false)
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

  const toggleWriteScope = (scope: string) => {
    setWriteScopes((current) =>
      current.includes(scope)
        ? current.filter((value) => value !== scope)
        : [...current, scope],
    )
  }

  return (
    <div className="space-y-4 border border-black/10 p-4 dark:border-white/10 sm:p-5">
      <p className="text-sm text-black/60 dark:text-white/60">
        {labels.description}
      </p>

      {!authChecked ? (
        <p className="text-sm text-black/45 dark:text-white/45">…</p>
      ) : authenticated ? (
        <div className="space-y-3">
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
        </div>
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
        <p className="text-sm text-rose-700 dark:text-rose-400">{authError}</p>
      ) : null}
      {tokenActionError ? (
        <p className="text-sm text-rose-700 dark:text-rose-400">
          {sanitizeErrorMessage(tokenActionError)}
        </p>
      ) : null}

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
              onClick={() => setRevealed((value) => !value)}
              className="text-sm text-black/55 underline-offset-4 hover:underline dark:text-white/55"
            >
              {revealed ? labels.hide : labels.show}
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
        <input
          id="docs-playground-token"
          type={revealed ? "text" : "password"}
          value={token}
          onChange={(event) => {
            const next = event.target.value.trim()
            persistToken(next, next === token ? tokenId : null)
            setRevealed(false)
          }}
          placeholder={labels.pastePlaceholder}
          spellCheck={false}
          autoComplete="off"
          autoCorrect="off"
          autoCapitalize="off"
          className="w-full border border-black/10 bg-transparent px-3 py-2 font-mono text-sm outline-none focus:border-black/30 dark:border-white/10 dark:focus:border-white/30"
        />
      </div>
    </div>
  )
}

type DocsRouteTryProps = {
  method: string
  path: string
  /** When false, Send works without a bearer token (OAuth token endpoints). */
  requiresAuth?: boolean
  defaultBody?: string
  parameters?: OpenApiParameter[]
  hasBody?: boolean
}

/**
 * Compact try panel for a single API route. Shares bearer token state with
 * `DocsBearerTokenPanel` via `DocsPlaygroundTokenProvider`.
 */
export function DocsRouteTry({
  method: initialMethod,
  path: initialPath,
  requiresAuth = true,
  defaultBody = "{\n  \n}",
  parameters = [],
  hasBody,
}: DocsRouteTryProps) {
  const { token, labels } = usePlaygroundToken()
  const fieldId = useId()
  const method = initialMethod.toUpperCase()
  const [path, setPath] = useState(initialPath)
  const [body, setBody] = useState(defaultBody)
  const [parameterValues, setParameterValues] = useState<
    Record<string, string>
  >({})
  const [sending, setSending] = useState(false)
  const [status, setStatus] = useState<number | null>(null)
  const [responseText, setResponseText] = useState("")
  const [requestError, setRequestError] = useState<string | null>(null)

  const requestParameters = parameters.filter(
    (parameter) => parameter.in === "path" || parameter.in === "query",
  )
  const canHaveBody =
    hasBody ?? (method !== "GET" && method !== "HEAD")

  const buildRequestPath = (): string | null => {
    let nextPath = path

    for (const parameter of requestParameters) {
      const name = parameter.name
      if (!name) continue
      const value = parameterValues[`${parameter.in}:${name}`]?.trim() ?? ""
      if (parameter.in === "path") {
        const placeholder = `{${name}}`
        if (parameter.required && !value && nextPath.includes(placeholder)) {
          setRequestError(
            labels.requiredParameter.replace("{name}", name),
          )
          return null
        }
        if (value) {
          nextPath = nextPath.replace(
            placeholder,
            encodeURIComponent(value),
          )
        }
      }
    }

    const [pathname, existingQuery = ""] = nextPath.split("?", 2)
    const query = new URLSearchParams(existingQuery)
    for (const parameter of requestParameters) {
      if (parameter.in !== "query" || !parameter.name) continue
      const value =
        parameterValues[`query:${parameter.name}`]?.trim() ?? ""
      if (parameter.required && !value) {
        setRequestError(
          labels.requiredParameter.replace("{name}", parameter.name),
        )
        return null
      }
      if (value) query.set(parameter.name, value)
      else query.delete(parameter.name)
    }

    const queryString = query.toString()
    return queryString ? `${pathname}?${queryString}` : pathname
  }

  const handleSend = async () => {
    const bearer = token.trim()
    if (requiresAuth && !bearer) {
      setRequestError(labels.noToken)
      return
    }

    const requestPath = buildRequestPath()
    if (!requestPath) return
    let requestUrl: URL
    try {
      requestUrl = new URL(requestPath, window.location.origin)
    } catch {
      setRequestError(labels.invalidPath)
      return
    }
    if (!requestPath.startsWith("/") || requestUrl.origin !== window.location.origin) {
      setRequestError(labels.invalidPath)
      return
    }

    if (canHaveBody && body.trim()) {
      try {
        JSON.parse(body)
      } catch {
        setRequestError(labels.invalidJson)
        return
      }
    }

    setSending(true)
    setRequestError(null)
    setStatus(null)
    setResponseText("")

    try {
      const headers: HeadersInit = {
        Accept: "application/json",
      }
      if (bearer) {
        headers.Authorization = `Bearer ${bearer}`
      }

      const init: RequestInit = {
        method,
        headers,
      }

      if (canHaveBody && body.trim()) {
        headers["Content-Type"] = "application/json"
        init.body = body
      }

      const response = await fetch(
        `${requestUrl.pathname}${requestUrl.search}`,
        init,
      )
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
    <div className="not-prose my-6 space-y-4 border border-black/10 p-3 dark:border-white/10 sm:p-4">
      <h4 className="text-xs font-medium uppercase tracking-wide text-black/45 dark:text-white/45">
        {labels.tryThis}
      </h4>

      {!requiresAuth ? (
        <p className="text-xs text-black/55 dark:text-white/55">
          {labels.authOptional}
        </p>
      ) : null}

      <div className="grid gap-3 sm:grid-cols-[6.5rem_minmax(0,1fr)]">
        <div className="space-y-1.5">
          <span className="text-xs font-medium uppercase tracking-wide text-black/45 dark:text-white/45">
            {labels.method}
          </span>
          <div className="border border-black/10 px-3 py-2 font-mono text-sm dark:border-white/10">
            {method}
          </div>
        </div>
        <div className="space-y-1.5">
          <label
            htmlFor={`${fieldId}-path`}
            className="text-xs font-medium uppercase tracking-wide text-black/45 dark:text-white/45"
          >
            {labels.path}
          </label>
          <input
            id={`${fieldId}-path`}
            value={path}
            onChange={(event) => setPath(event.target.value)}
            spellCheck={false}
            className="w-full border border-black/10 bg-transparent px-3 py-2 font-mono text-base outline-none focus-visible:border-black/30 focus-visible:ring-2 focus-visible:ring-black/10 sm:text-sm dark:border-white/10 dark:focus-visible:border-white/30 dark:focus-visible:ring-white/10"
          />
        </div>
      </div>

      {requestParameters.length > 0 ? (
        <fieldset className="space-y-3">
          <legend className="text-xs font-medium uppercase tracking-wide text-black/45 dark:text-white/45">
            {requestParameters.some((parameter) => parameter.in === "query")
              ? labels.queryParameters
              : labels.parameters}
          </legend>
          <div className="grid gap-3 sm:grid-cols-2">
            {requestParameters.map((parameter, index) => {
              const name = parameter.name ?? `parameter-${index}`
              const key = `${parameter.in}:${name}`
              const schemaDefault = parameter.schema?.default
              const placeholder =
                schemaDefault === undefined ? undefined : String(schemaDefault)
              return (
                <label key={key} className="space-y-1.5">
                  <span className="flex flex-wrap items-baseline gap-1.5 text-xs font-medium text-black/60 dark:text-white/60">
                    <code className="font-mono text-black dark:text-white">
                      {name}
                    </code>
                    <span className="font-normal text-black/45 dark:text-white/45">
                      {parameter.in}
                      {parameter.required ? ` · ${labels.required}` : ""}
                    </span>
                  </span>
                  <input
                    value={parameterValues[key] ?? ""}
                    onChange={(event) =>
                      setParameterValues((current) => ({
                        ...current,
                        [key]: event.target.value,
                      }))
                    }
                    placeholder={placeholder}
                    required={parameter.required}
                    spellCheck={false}
                    className="w-full border border-black/10 bg-transparent px-3 py-2 font-mono text-base outline-none focus-visible:border-black/30 focus-visible:ring-2 focus-visible:ring-black/10 sm:text-sm dark:border-white/10 dark:focus-visible:border-white/30 dark:focus-visible:ring-white/10"
                  />
                  {parameter.description ? (
                    <span className="block text-xs leading-relaxed text-black/50 dark:text-white/50">
                      {parameter.description}
                    </span>
                  ) : null}
                </label>
              )
            })}
          </div>
        </fieldset>
      ) : null}

      {canHaveBody ? (
        <div className="space-y-1.5">
          <label
            htmlFor={`${fieldId}-body`}
            className="text-xs font-medium uppercase tracking-wide text-black/45 dark:text-white/45"
          >
            {labels.body}
          </label>
          <textarea
            id={`${fieldId}-body`}
            value={body}
            onChange={(event) => setBody(event.target.value)}
            rows={5}
            spellCheck={false}
            className="w-full resize-y border border-black/10 bg-transparent px-3 py-2 font-mono text-base outline-none focus-visible:border-black/30 focus-visible:ring-2 focus-visible:ring-black/10 sm:text-xs dark:border-white/10 dark:focus-visible:border-white/30 dark:focus-visible:ring-white/10"
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
        <p role="alert" className="text-sm text-rose-700 dark:text-rose-400">
          {requestError}
        </p>
      ) : null}

      {(status !== null || responseText) && (
        <div className="space-y-2" role="status" aria-live="polite">
          <div className="flex items-baseline justify-between gap-3">
            <h5 className="text-xs font-medium uppercase tracking-wide text-black/45 dark:text-white/45">
              {labels.response}
            </h5>
            {status !== null ? (
              <span className="font-mono text-xs text-black/55 dark:text-white/55">
                HTTP {status}
              </span>
            ) : null}
          </div>
          <pre className="max-h-72 overflow-auto border border-black/10 bg-black/[0.015] p-3 font-mono text-xs leading-relaxed text-black/80 dark:border-white/10 dark:bg-white/[0.02] dark:text-white/80">
            {responseText || "—"}
          </pre>
        </div>
      )}
    </div>
  )
}
