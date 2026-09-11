"use client"

import { DocsRouteTry, useDocsPlayground } from "./playground-token"
import {
  getOpenApiOperation,
  type JsonSchema,
} from "./openapi-schema"

type DocsNarrativeRouteTryProps = {
  method: string
  path: string
  defaultPath?: string
  defaultBody?: string
}

function schemaExample(schema: JsonSchema | undefined, depth = 0): unknown {
  if (!schema || depth > 6) return {}
  if (schema.example !== undefined) return schema.example
  if (schema.default !== undefined) return schema.default

  const oneOf = Array.isArray(schema.oneOf) ? schema.oneOf : []
  if (oneOf.length > 0) {
    return schemaExample(oneOf[0] as JsonSchema, depth + 1)
  }

  const enumValues = Array.isArray(schema.enum) ? schema.enum : []
  if (enumValues.length > 0) return enumValues[0]

  if (schema.type === "array") {
    return [schemaExample(schema.items as JsonSchema | undefined, depth + 1)]
  }

  if (schema.type === "object" || schema.properties) {
    const properties = (schema.properties ?? {}) as Record<string, JsonSchema>
    const required = new Set(
      Array.isArray(schema.required)
        ? schema.required.filter(
            (value): value is string => typeof value === "string",
          )
        : [],
    )
    return Object.fromEntries(
      Object.entries(properties)
        .filter(([name]) => required.has(name))
        .map(([name, property]) => [
          name,
          schemaExample(property, depth + 1),
        ]),
    )
  }

  if (schema.type === "number" || schema.type === "integer") return 0
  if (schema.type === "boolean") return false
  return ""
}

function UnavailablePanel({
  title,
  message,
}: {
  title: string
  message: string
}) {
  return (
    <div className="not-prose my-6 space-y-2 border border-black/10 p-3 dark:border-white/10 sm:p-4">
      <h4 className="text-xs font-medium uppercase tracking-wide text-black/45 dark:text-white/45">
        {title}
      </h4>
      <p className="text-sm leading-relaxed text-black/60 dark:text-white/60">
        {message}
      </p>
    </div>
  )
}

/**
 * Narrative-doc marker backed by the live OpenAPI operation. MDX owns only the
 * method/path mapping; parameters, auth, body shape, and limitations stay in
 * sync with `/openapi.json`.
 */
export function DocsNarrativeRouteTry({
  method,
  path,
  defaultPath,
  defaultBody,
}: DocsNarrativeRouteTryProps) {
  const {
    labels,
    openApiDocument,
    openApiLoading,
    openApiError,
    reloadOpenApi,
  } = useDocsPlayground()

  if (path === "/oauth/authorize") {
    return (
      <UnavailablePanel
        title={labels.tryThis}
        message={labels.authorizeUnsupported}
      />
    )
  }

  if (openApiLoading) {
    return (
      <div className="not-prose my-6 border border-black/10 p-3 text-sm text-black/55 dark:border-white/10 dark:text-white/55 sm:p-4">
        {labels.schemaLoading}
      </div>
    )
  }

  if (openApiError) {
    return (
      <div className="not-prose my-6 flex flex-wrap items-center gap-3 border border-black/10 p-3 dark:border-white/10 sm:p-4">
        <p className="text-sm text-black/60 dark:text-white/60">
          {labels.schemaError}
        </p>
        <button
          type="button"
          onClick={reloadOpenApi}
          className="text-sm underline-offset-4 hover:underline"
        >
          {labels.retry}
        </button>
      </div>
    )
  }

  const operation = getOpenApiOperation(openApiDocument, method, path)
  if (!operation) {
    return (
      <UnavailablePanel
        title={labels.tryThis}
        message={labels.unsupportedRoute}
      />
    )
  }

  const content = operation.requestBody?.content
  const jsonMedia = content
    ? Object.entries(content).find(
        ([mediaType]) =>
          mediaType === "application/json" || mediaType.endsWith("+json"),
      )
    : undefined
  const hasMultipart = Boolean(
    content &&
      Object.keys(content).some((mediaType) =>
        mediaType.includes("multipart/form-data"),
      ),
  )
  const hasFormEncoded = Boolean(
    content &&
      Object.keys(content).some((mediaType) =>
        mediaType.includes("application/x-www-form-urlencoded"),
      ),
  )

  if (!jsonMedia && hasMultipart) {
    return (
      <UnavailablePanel
        title={labels.tryThis}
        message={labels.multipartUnsupported}
      />
    )
  }
  if (!jsonMedia && hasFormEncoded) {
    return (
      <UnavailablePanel
        title={labels.tryThis}
        message={labels.formUnsupported}
      />
    )
  }

  const requiresAuth = !(
    Array.isArray(operation.security) && operation.security.length === 0
  )
  const generatedBody = jsonMedia
    ? JSON.stringify(schemaExample(jsonMedia[1].schema), null, 2)
    : undefined

  return (
    <DocsRouteTry
      method={method}
      path={defaultPath ?? path}
      requiresAuth={requiresAuth}
      parameters={operation.parameters}
      hasBody={Boolean(jsonMedia)}
      defaultBody={defaultBody ?? generatedBody}
    />
  )
}
