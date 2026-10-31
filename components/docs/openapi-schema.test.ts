import { describe, expect, it } from "vitest"
import { getOpenApiOperation, type DocsOpenApiDocument } from "./openapi-schema"

const doc: DocsOpenApiDocument = {
  servers: [{ url: "https://www.deltalytix.app/api" }],
  paths: {
    "/v1/trades": { get: { summary: "List trades" } },
    "/v1/connections/{id}/sync": { post: { summary: "Sync" } },
    "/oauth/token": { post: { summary: "Token" } },
  } as DocsOpenApiDocument["paths"],
}

describe("getOpenApiOperation", () => {
  it("matches docs paths that include the /api server base path", () => {
    expect(getOpenApiOperation(doc, "GET", "/api/v1/trades")?.summary).toBe("List trades")
    expect(getOpenApiOperation(doc, "POST", "/api/v1/connections/{id}/sync")).not.toBeNull()
    expect(getOpenApiOperation(doc, "POST", "/api/oauth/token")).not.toBeNull()
  })
  it("still matches spec-relative paths", () => {
    expect(getOpenApiOperation(doc, "get", "/v1/trades")).not.toBeNull()
  })
  it("returns null for unknown routes or methods", () => {
    expect(getOpenApiOperation(doc, "DELETE", "/api/v1/trades")).toBeNull()
    expect(getOpenApiOperation(doc, "GET", "/oauth/authorize")).toBeNull()
  })
})
