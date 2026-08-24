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
  createDocsDemoTokenAction,
  createDocsPlaygroundTokenAction,
  getDocsPlaygroundAuthAction,
  revokeDocsPlaygroundTokenAction,
} from "@/app/[locale]/(landing)/docs/actions"
import type {
  DocsOpenApiDocument,
  OpenApiParameter,
} from "@/components/docs/openapi-schema"
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { useMediaQuery } from "@/hooks/use-media-query"

const TOKEN_STORAGE_KEY = "deltalytix.docs.playground.token"
const TOKEN_ID_STORAGE_KEY = "deltalytix.docs.playground.tokenId"
const TOKEN_SOURCE_STORAGE_KEY = "deltalytix.docs.playground.tokenSource"

type TokenSource = "demo" | "docs" | "paste"

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
    sheetTitle: "Get a token",
    getToken: "Get a token",
    changeToken: "Change token",
    description:
      "Generate a docs token when signed in, use a demo token to try read routes, or paste a PAT.",
    signedInAs: "Signed in as {email}",
    signedIn: "Signed in",
    generateToken: "Generate docs token",
    generating: "Generating…",
    useDemoToken: "Use demo token",
    demoHint:
      "Read-only sample trades. Sign in to use your own data or to write.",
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
    demoError: "Could not create a demo token.",
    authOptional: "No bearer token required for this route.",
  },
  fr: {
    sheetTitle: "Obtenir un jeton",
    getToken: "Obtenir un jeton",
    changeToken: "Changer le jeton",
    description:
      "Générez un token docs une fois connecté, utilisez un token démo pour les routes en lecture, ou collez un PAT.",
    signedInAs: "Connecté en tant que {email}",
    signedIn: "Connecté",
    generateToken: "Générer un token docs",
    generating: "Génération…",
    useDemoToken: "Utiliser un token démo",
    demoHint:
      "Trades d’exemple en lecture seule. Connectez-vous pour vos propres données ou pour écrire.",
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
    demoError: "Impossible de créer un token démo.",
    authOptional: "Aucun jeton bearer requis pour cette route.",
  },
} as const

type PlaygroundCopy = (typeof COPY)[keyof typeof COPY]

type PlaygroundTokenContextValue = {
  token: string
  tokenId: string | null
  tokenSource: TokenSource | null
  labels: PlaygroundCopy
  persistToken: (
    token: string,
    tokenId: string | null,
    source?: TokenSource | null,
  ) => void
  tokenSheetOpen: boolean
  openTokenSheet: () => void
  setTokenSheetOpen: (open: boolean) => void
  openApiDocument: DocsOpenApiDocument | null
  openApiLoading: boolean
  openApiError: boolean
  reloadOpenApi: () => void
}

const DOCS_BUTTON_CLASS =
  "border border-black/15 px-3 py-2 text-sm transition-colors hover:bg-black/[0.03] disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black/10 dark:border-white/15 dark:hover:bg-white/[0.04] dark:focus-visible:ring-white/10"

const DOCS_TEXT_BUTTON_CLASS =
  "px-3 py-2 text-sm text-black/55 underline-offset-4 hover:underline disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black/10 dark:text-white/55 dark:focus-visible:ring-white/10"

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

function parseTokenSource(value: string | null): TokenSource | null {
  if (value === "demo" || value === "docs" || value === "paste") return value
  return null
}

function readSessionToken(): {
  token: string
  tokenId: string | null
  tokenSource: TokenSource | null
} {
  if (typeof window === "undefined") {
    return { token: "", tokenId: null, tokenSource: null }
  }
  try {
    return {
      token: sessionStorage.getItem(TOKEN_STORAGE_KEY) ?? "",
      tokenId: sessionStorage.getItem(TOKEN_ID_STORAGE_KEY),
      tokenSource: parseTokenSource(
        sessionStorage.getItem(TOKEN_SOURCE_STORAGE_KEY),
      ),
    }
  } catch {
    return { token: "", tokenId: null, tokenSource: null }
  }
}

function writeSessionToken(
  token: string,
  tokenId: string | null,
  tokenSource: TokenSource | null,
) {
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
    if (token && tokenSource) {
      sessionStorage.setItem(TOKEN_SOURCE_STORAGE_KEY, tokenSource)
    } else {
      sessionStorage.removeItem(TOKEN_SOURCE_STORAGE_KEY)
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
  const [tokenSource, setTokenSource] = useState<TokenSource | null>(null)
  const [openApiDocument, setOpenApiDocument] =
    useState<DocsOpenApiDocument | null>(null)
  const [openApiLoading, setOpenApiLoading] = useState(true)
  const [openApiError, setOpenApiError] = useState(false)
  const [tokenSheetOpen, setTokenSheetOpen] = useState(false)

  useEffect(() => {
    const stored = readSessionToken()
    setToken(stored.token)
    setTokenId(stored.tokenId)
    setTokenSource(stored.tokenSource)
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

  const persistToken = useCallback(
    (
      nextToken: string,
      nextId: string | null,
      nextSource?: TokenSource | null,
    ) => {
      const source = nextToken ? (nextSource ?? "paste") : null
      setToken(nextToken)
      setTokenId(nextId)
      setTokenSource(source)
      writeSessionToken(nextToken, nextId, source)
    },
    [],
  )

  const openTokenSheet = useCallback(() => {
    setTokenSheetOpen(true)
  }, [])

  const value = useMemo(
    () => ({
      token,
      tokenId,
      tokenSource,
      labels,
      persistToken,
      tokenSheetOpen,
      openTokenSheet,
      setTokenSheetOpen,
      openApiDocument,
      openApiLoading,
      openApiError,
      reloadOpenApi,
    }),
    [
      token,
      tokenId,
      tokenSource,
      labels,
      persistToken,
      tokenSheetOpen,
      openTokenSheet,
      openApiDocument,
      openApiLoading,
      openApiError,
      reloadOpenApi,
    ],
  )

  return (
    <PlaygroundTokenContext.Provider value={value}>
      {children}
      <DocsTokenSheet />
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
 * Shared bearer token controls — demo when signed out, generate when signed in,
 * or paste a PAT. Input is `type="password"` so the secret stays redacted after paste.
 */
export function DocsBearerTokenPanel({
  embedded = false,
}: {
  embedded?: boolean
}) {
  const locale = useCurrentLocale()
  const { token, tokenId, tokenSource, labels, persistToken, setTokenSheetOpen } =
    usePlaygroundToken()
  const tokenFieldId = useId()
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
        persistToken(result.token, result.id, "docs")
        setTokenSheetOpen(false)
      } catch {
        setTokenActionError(labels.tokenError)
      }
    })
  }

  const handleUseDemoToken = () => {
    setTokenActionError(null)
    setRevealed(false)
    startTransition(async () => {
      try {
        const result = await createDocsDemoTokenAction()
        if ("error" in result) {
          setTokenActionError(result.error || labels.demoError)
          return
        }
        persistToken(result.token, result.id, "demo")
        setTokenSheetOpen(false)
      } catch {
        setTokenActionError(labels.demoError)
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
    <div
      className={
        embedded
          ? "space-y-4"
          : "not-prose space-y-4 border border-black/10 p-4 dark:border-white/10 sm:p-5"
      }
    >
      {embedded ? null : (
        <p className="text-sm text-black/60 dark:text-white/60">
          {labels.description}
        </p>
      )}

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
                  className="flex min-h-10 items-center gap-2 font-mono text-xs text-black/70 dark:text-white/70"
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
              className={DOCS_BUTTON_CLASS}
            >
              {pending ? labels.generating : labels.generateToken}
            </button>
            {tokenId && tokenSource !== "demo" ? (
              <button
                type="button"
                onClick={handleRevokeToken}
                disabled={pending}
                className={DOCS_TEXT_BUTTON_CLASS}
              >
                {labels.revoke}
              </button>
            ) : null}
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          <div className="space-y-2">
            <button
              type="button"
              onClick={handleUseDemoToken}
              disabled={pending}
              className={DOCS_BUTTON_CLASS}
            >
              {pending ? labels.generating : labels.useDemoToken}
            </button>
            <p className="text-sm text-black/55 dark:text-white/55">
              {labels.demoHint}
            </p>
          </div>
          <Link
            href={signInHref}
            className="inline-block min-h-10 py-2 text-sm underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black/10 dark:focus-visible:ring-white/10"
          >
            {labels.signIn}
          </Link>
        </div>
      )}

      {authError ? (
        <p role="alert" className="text-sm text-rose-700 dark:text-rose-400">
          {authError}
        </p>
      ) : null}
      {tokenActionError ? (
        <p role="alert" className="text-sm text-rose-700 dark:text-rose-400">
          {sanitizeErrorMessage(tokenActionError)}
        </p>
      ) : null}

      <div className="space-y-2">
        <label
          htmlFor={tokenFieldId}
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
              className={DOCS_TEXT_BUTTON_CLASS}
            >
              {copied ? labels.copied : labels.copy}
            </button>
            <button
              type="button"
              onClick={() => setRevealed((value) => !value)}
              className={DOCS_TEXT_BUTTON_CLASS}
            >
              {revealed ? labels.hide : labels.show}
            </button>
            <button
              type="button"
              onClick={handleClearToken}
              className={DOCS_TEXT_BUTTON_CLASS}
            >
              {labels.clear}
            </button>
          </div>
        ) : null}
        <input
          id={tokenFieldId}
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
          className="w-full border border-black/10 bg-transparent px-3 py-2 font-mono text-sm outline-none focus-visible:border-black/30 focus-visible:ring-2 focus-visible:ring-black/10 dark:border-white/10 dark:focus-visible:border-white/30 dark:focus-visible:ring-white/10"
        />
      </div>
    </div>
  )
}

function DocsTokenSheet() {
  const { tokenSheetOpen, setTokenSheetOpen, labels } = usePlaygroundToken()
  const isDesktop = useMediaQuery("(min-width: 768px)")

  if (isDesktop) {
    return (
      <Sheet open={tokenSheetOpen} onOpenChange={setTokenSheetOpen}>
        <SheetContent
          side="right"
          className="flex w-full flex-col overflow-y-auto overscroll-contain sm:max-w-lg"
        >
          <SheetHeader className="pr-8 text-left">
            <SheetTitle className="font-normal tracking-tight">
              {labels.sheetTitle}
            </SheetTitle>
            <SheetDescription>{labels.description}</SheetDescription>
          </SheetHeader>
          <div className="mt-6">
            <DocsBearerTokenPanel embedded />
          </div>
        </SheetContent>
      </Sheet>
    )
  }

  return (
    <Drawer
      shouldScaleBackground={false}
      open={tokenSheetOpen}
      onOpenChange={setTokenSheetOpen}
    >
      <DrawerContent className="max-h-[85vh]">
        <DrawerHeader className="text-left">
          <DrawerTitle className="font-normal tracking-tight">
            {labels.sheetTitle}
          </DrawerTitle>
          <DrawerDescription>{labels.description}</DrawerDescription>
        </DrawerHeader>
        <div className="overflow-y-auto overscroll-contain px-4 pb-[max(1.5rem,env(safe-area-inset-bottom))]">
          <DocsBearerTokenPanel embedded />
        </div>
      </DrawerContent>
    </Drawer>
  )
}

/** Opens the shared token sheet from Authentication and other MDX sections. */
export function DocsGetTokenButton() {
  const { token, labels, openTokenSheet, tokenSheetOpen } = usePlaygroundToken()

  return (
    <div className="not-prose my-6">
      <button
        type="button"
        onClick={openTokenSheet}
        aria-haspopup="dialog"
        aria-expanded={tokenSheetOpen}
        className={DOCS_BUTTON_CLASS}
      >
        {token ? labels.changeToken : labels.getToken}
      </button>
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
 * Compact try panel for a single API route. Opens the shared token sheet when
 * a bearer token is missing.
 */
export function DocsRouteTry({
  method: initialMethod,
  path: initialPath,
  requiresAuth = true,
  defaultBody = "{\n  \n}",
  parameters = [],
  hasBody,
}: DocsRouteTryProps) {
  const { token, labels, openTokenSheet, tokenSheetOpen } = usePlaygroundToken()
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
      openTokenSheet()
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

      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <button
          type="button"
          onClick={() => void handleSend()}
          disabled={sending}
          className={DOCS_BUTTON_CLASS}
        >
          {sending ? labels.sending : labels.send}
        </button>
        {requiresAuth ? (
          <div className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1">
            {token ? (
              <code className="font-mono text-xs text-black/70 dark:text-white/70">
                {maskToken(token)}
              </code>
            ) : null}
            <button
              type="button"
              onClick={openTokenSheet}
              aria-haspopup="dialog"
              aria-expanded={tokenSheetOpen}
              className={token ? DOCS_TEXT_BUTTON_CLASS : DOCS_BUTTON_CLASS}
            >
              {token ? labels.changeToken : labels.getToken}
            </button>
          </div>
        ) : null}
      </div>

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
