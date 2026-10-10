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
  const operation = document?.paths?.[path]?.[method.toLowerCase()]
  return operation && !Array.isArray(operation) ? operation : null
}
