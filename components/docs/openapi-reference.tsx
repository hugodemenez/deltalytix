"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { useCurrentLocale } from "@/locales/landing-client"
import { ChevronDown } from "lucide-react"

type JsonSchema = Record<string, unknown>

type OpenApiParameter = {
  name?: string
  in?: string
  required?: boolean
  description?: string
  schema?: JsonSchema
}

type OpenApiOperation = {
  summary?: string
  description?: string
  parameters?: OpenApiParameter[]
  requestBody?: {
    required?: boolean
    description?: string
    content?: Record<
      string,
      {
        schema?: JsonSchema
      }
    >
  }
  responses?: Record<
    string,
    {
      description?: string
    }
  >
  security?: unknown[]
}

type OpenApiPathItem = Record<string, OpenApiOperation | undefined>

export type DocsOpenApiDocument = {
  openapi?: string
  info?: {
    title?: string
    version?: string
    description?: string
  }
  paths?: Record<string, OpenApiPathItem>
}

type DocsOpenApiReferenceProps = {
  document?: DocsOpenApiDocument | null
  openApiUrl?: string
}

const HTTP_METHODS = [
  "get",
  "post",
  "put",
  "patch",
  "delete",
  "options",
  "head",
] as const

const COPY = {
  en: {
    title: "OpenAPI reference",
    description:
      "Paths, methods, parameters, and response codes from the live OpenAPI document.",
    download: "Download openapi.json",
    loading: "Loading OpenAPI document…",
    error: "Could not load the OpenAPI document.",
    retry: "Retry",
    empty: "No paths found in the OpenAPI document.",
    parameters: "Parameters",
    requestBody: "Request body",
    responses: "Responses",
    required: "required",
    noSummary: "No summary",
    schemaOutline: "Schema outline",
  },
  fr: {
    title: "Référence OpenAPI",
    description:
      "Chemins, méthodes, paramètres et codes de réponse issus du document OpenAPI live.",
    download: "Télécharger openapi.json",
    loading: "Chargement du document OpenAPI…",
    error: "Impossible de charger le document OpenAPI.",
    retry: "Réessayer",
    empty: "Aucun chemin trouvé dans le document OpenAPI.",
    parameters: "Paramètres",
    requestBody: "Corps de la requête",
    responses: "Réponses",
    required: "requis",
    noSummary: "Aucun résumé",
    schemaOutline: "Aperçu du schéma",
  },
} as const

function schemaOutline(schema: JsonSchema | undefined, depth = 0): string {
  if (!schema || depth > 3) return ""

  if (typeof schema.$ref === "string") {
    return schema.$ref.replace("#/components/schemas/", "")
  }

  if (Array.isArray(schema.type)) {
    return schema.type.join(" | ")
  }

  if (schema.type === "array") {
    const items = schemaOutline(schema.items as JsonSchema | undefined, depth + 1)
    return items ? `array<${items}>` : "array"
  }

  if (schema.type === "object" || schema.properties) {
    const properties = (schema.properties ?? {}) as Record<string, JsonSchema>
    const keys = Object.keys(properties)
    if (keys.length === 0) return "object"
    const required = new Set(
      Array.isArray(schema.required)
        ? schema.required.filter((value): value is string => typeof value === "string")
        : [],
    )
    const fields = keys.slice(0, 8).map((key) => {
      const nested = schemaOutline(properties[key], depth + 1) || "any"
      return `${key}${required.has(key) ? "*" : ""}: ${nested}`
    })
    const more = keys.length > 8 ? `, …+${keys.length - 8}` : ""
    return `{ ${fields.join(", ")}${more} }`
  }

  if (typeof schema.type === "string") {
    return schema.type
  }

  return "any"
}

function methodClassName(method: string): string {
  switch (method) {
    case "get":
      return "text-emerald-700 dark:text-emerald-400"
    case "post":
      return "text-sky-700 dark:text-sky-400"
    case "put":
    case "patch":
      return "text-amber-700 dark:text-amber-400"
    case "delete":
      return "text-rose-700 dark:text-rose-400"
    default:
      return "text-black/70 dark:text-white/70"
  }
}

type OpenApiCopy = (typeof COPY)[keyof typeof COPY]

function PathOperation({
  path,
  method,
  operation,
  labels,
}: {
  path: string
  method: string
  operation: OpenApiOperation
  labels: OpenApiCopy
}) {
  const [open, setOpen] = useState(false)
  const bodyContent = operation.requestBody?.content
  const bodyMedia = bodyContent
    ? Object.entries(bodyContent)[0]
    : undefined
  const parameters = operation.parameters ?? []
  const responses = Object.entries(operation.responses ?? {})

  return (
    <div className="border-b border-black/10 dark:border-white/10">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="flex w-full items-start gap-3 py-4 text-left transition-colors hover:bg-black/[0.02] dark:hover:bg-white/[0.03]"
        aria-expanded={open}
      >
        <span
          className={`mt-0.5 w-16 shrink-0 font-mono text-xs font-semibold uppercase tracking-wide ${methodClassName(method)}`}
        >
          {method}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block break-all font-mono text-sm text-black dark:text-white">
            {path}
          </span>
          <span className="mt-1 block text-sm text-black/55 dark:text-white/55">
            {operation.summary || labels.noSummary}
          </span>
        </span>
        <ChevronDown
          className={`mt-1 size-4 shrink-0 text-black/40 transition-transform dark:text-white/40 ${open ? "rotate-180" : ""}`}
          aria-hidden
        />
      </button>

      {open ? (
        <div className="space-y-5 pb-5 pl-[4.75rem] text-sm">
          {operation.description ? (
            <p className="text-black/60 dark:text-white/60">
              {operation.description}
            </p>
          ) : null}

          {parameters.length > 0 ? (
            <div>
              <h4 className="mb-2 text-xs font-medium uppercase tracking-wide text-black/45 dark:text-white/45">
                {labels.parameters}
              </h4>
              <ul className="space-y-2">
                {parameters.map((parameter) => (
                  <li
                    key={`${parameter.in}-${parameter.name}`}
                    className="font-mono text-xs leading-relaxed text-black/75 dark:text-white/75"
                  >
                    <span className="text-black dark:text-white">
                      {parameter.name}
                    </span>
                    {parameter.in ? (
                      <span className="text-black/45 dark:text-white/45">
                        {" "}
                        ({parameter.in})
                      </span>
                    ) : null}
                    {parameter.required ? (
                      <span className="text-black/45 dark:text-white/45">
                        {" "}
                        · {labels.required}
                      </span>
                    ) : null}
                    {parameter.schema ? (
                      <span className="text-black/45 dark:text-white/45">
                        {" "}
                        · {schemaOutline(parameter.schema)}
                      </span>
                    ) : null}
                    {parameter.description ? (
                      <span className="mt-0.5 block font-sans text-black/55 dark:text-white/55">
                        {parameter.description}
                      </span>
                    ) : null}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          {bodyMedia ? (
            <div>
              <h4 className="mb-2 text-xs font-medium uppercase tracking-wide text-black/45 dark:text-white/45">
                {labels.requestBody}
              </h4>
              <p className="font-mono text-xs text-black/70 dark:text-white/70">
                {bodyMedia[0]}
                {operation.requestBody?.required
                  ? ` · ${labels.required}`
                  : ""}
              </p>
              {bodyMedia[1]?.schema ? (
                <p className="mt-2 break-all font-mono text-xs leading-relaxed text-black/55 dark:text-white/55">
                  <span className="text-black/45 dark:text-white/45">
                    {labels.schemaOutline}:{" "}
                  </span>
                  {schemaOutline(bodyMedia[1].schema)}
                </p>
              ) : null}
            </div>
          ) : null}

          {responses.length > 0 ? (
            <div>
              <h4 className="mb-2 text-xs font-medium uppercase tracking-wide text-black/45 dark:text-white/45">
                {labels.responses}
              </h4>
              <ul className="space-y-1.5">
                {responses.map(([code, response]) => (
                  <li
                    key={code}
                    className="font-mono text-xs text-black/75 dark:text-white/75"
                  >
                    <span className="text-black dark:text-white">{code}</span>
                    {response.description ? (
                      <span className="font-sans text-black/55 dark:text-white/55">
                        {" "}
                        — {response.description}
                      </span>
                    ) : null}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  )
}

export function DocsOpenApiReference({
  document: documentProp,
  openApiUrl = "/openapi.json",
}: DocsOpenApiReferenceProps) {
  const locale = useCurrentLocale()
  const labels = COPY[locale === "fr" ? "fr" : "en"]
  const [document, setDocument] = useState<DocsOpenApiDocument | null>(
    documentProp ?? null,
  )
  const [loading, setLoading] = useState(!documentProp)
  const [error, setError] = useState<string | null>(null)

  const loadDocument = useCallback(async () => {
    if (documentProp) {
      setDocument(documentProp)
      setLoading(false)
      setError(null)
      return
    }

    setLoading(true)
    setError(null)
    try {
      const response = await fetch(openApiUrl)
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`)
      }
      const json = (await response.json()) as DocsOpenApiDocument
      setDocument(json)
    } catch {
      setError(labels.error)
      setDocument(null)
    } finally {
      setLoading(false)
    }
  }, [documentProp, labels.error, openApiUrl])

  useEffect(() => {
    void loadDocument()
  }, [loadDocument])

  useEffect(() => {
    if (documentProp) {
      setDocument(documentProp)
      setLoading(false)
      setError(null)
    }
  }, [documentProp])

  const operations = useMemo(() => {
    const paths = document?.paths ?? {}
    const rows: Array<{
      path: string
      method: string
      operation: OpenApiOperation
    }> = []

    for (const [path, pathItem] of Object.entries(paths)) {
      if (!pathItem) continue
      for (const method of HTTP_METHODS) {
        const operation = pathItem[method]
        if (operation && typeof operation === "object") {
          rows.push({ path, method, operation })
        }
      }
    }

    return rows
  }, [document])

  return (
    <div>
      <div className="mb-2 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        {document?.info?.version ? (
          <p className="font-mono text-xs text-black/45 dark:text-white/45">
            {document.info.title ?? "API"} · v{document.info.version}
          </p>
        ) : (
          <p className="text-sm text-black/55 dark:text-white/55">
            {labels.description}
          </p>
        )}
        <a
          href={openApiUrl}
          download="openapi.json"
          className="shrink-0 text-sm text-black/55 underline-offset-4 hover:text-black hover:underline dark:text-white/55 dark:hover:text-white"
        >
          {labels.download}
        </a>
      </div>

      {loading ? (
        <p className="py-8 text-sm text-black/55 dark:text-white/55">
          {labels.loading}
        </p>
      ) : null}

      {error ? (
        <div className="flex items-center gap-4 py-8">
          <p className="text-sm text-black/55 dark:text-white/55">{error}</p>
          <button
            type="button"
            onClick={() => void loadDocument()}
            className="text-sm underline-offset-4 hover:underline"
          >
            {labels.retry}
          </button>
        </div>
      ) : null}

      {!loading && !error && operations.length === 0 ? (
        <p className="py-8 text-sm text-black/55 dark:text-white/55">
          {labels.empty}
        </p>
      ) : null}

      {!loading && !error && operations.length > 0 ? (
        <div className="border-t border-black/10 dark:border-white/10">
          {operations.map(({ path, method, operation }) => (
            <PathOperation
              key={`${method}:${path}`}
              path={path}
              method={method}
              operation={operation}
              labels={labels}
            />
          ))}
        </div>
      ) : null}
    </div>
  )
}

export default DocsOpenApiReference
