export type JsonSchema = Record<string, unknown>

export type OpenApiParameter = {
  name?: string
  in?: string
  required?: boolean
  description?: string
  schema?: JsonSchema
}

export type OpenApiOperation = {
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

export type OpenApiPathItem = Record<
  string,
  OpenApiOperation | OpenApiParameter[] | undefined
>

export type DocsOpenApiDocument = {
  openapi?: string
  info?: {
    title?: string
    version?: string
    description?: string
  }
  servers?: Array<{ url: string }>
  paths?: Record<string, OpenApiPathItem>
}

export const DOCS_HTTP_METHODS = [
  "get",
  "post",
  "put",
  "patch",
  "delete",
  "options",
  "head",
] as const

export function getOpenApiOperation(
  document: DocsOpenApiDocument | null,
  method: string,
  path: string,
): OpenApiOperation | null {
  const key = method.toLowerCase()
  const paths = document?.paths
  if (!paths) return null
  // Spec paths are relative to the server URL (e.g. https://host/api), while
  // docs pages use the full same-origin path (/api/v1/...). Try both.
  const candidates = [path]
  for (const server of document?.servers ?? []) {
    let base = ""
    try {
      base = new URL(server.url, "https://placeholder.local").pathname
    } catch {
      continue
    }
    base = base.replace(/\/+$/, "")
    if (base && path.startsWith(`${base}/`)) {
      candidates.push(path.slice(base.length))
    }
  }
  if (path.startsWith("/api/")) candidates.push(path.slice(4))
  for (const candidate of candidates) {
    const operation = paths[candidate]?.[key]
    if (operation && !Array.isArray(operation)) return operation
  }
  return null
}
