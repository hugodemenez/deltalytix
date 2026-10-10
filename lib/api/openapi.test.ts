import { describe, expect, it } from "vitest";
import { READ_ONLY_SCOPES, scopeNames } from "@/lib/agent-discovery/metadata";
import { API_ERROR_STATUS } from "@/lib/api/json-error";
import { buildOpenApiDocument } from "./openapi";

function document() {
  return buildOpenApiDocument(new Request("https://deltalytix.app/openapi.json"));
}

describe("the published OpenAPI description", () => {
  it("declares scoped OAuth 2.0 alongside the bearer token scheme", async () => {
    const { components } = document();
    const schemes = components.securitySchemes;

    // Only the two schemes the runtime actually accepts: an OAuth access token
    // or a personal access token, both presented as `Authorization: Bearer`.
    expect(Object.keys(schemes).sort()).toEqual(["bearerAuth", "oauth2"]);
    expect(schemes.oauth2.type).toBe("oauth2");
    expect(schemes.bearerAuth).toMatchObject({ type: "http", scheme: "bearer" });
  });

  it("documents every scope with a description in the authorization code flow", async () => {
    const { components } = document();
    const flow = components.securitySchemes.oauth2.flows.authorizationCode;

    expect(Object.keys(flow.scopes)).toEqual(scopeNames());
    for (const description of Object.values(flow.scopes)) {
      expect(String(description).length).toBeGreaterThan(20);
    }
    expect(flow.authorizationUrl).toMatch(/^https:\/\//);
    expect(flow.tokenUrl).toMatch(/^https:\/\//);
  });

  it("requires the read-only scope set by default", async () => {
    const doc = document();

    expect(doc.security).toContainEqual({ oauth2: READ_ONLY_SCOPES });
  });

  it("leaves the public status endpoint unauthenticated", async () => {
    const doc = document();

    expect(doc.paths["/"].get.security).toEqual([{}]);
  });

  it("describes the JSON error envelope and references it from every error status", async () => {
    const doc = document();
    const schema = doc.components.schemas.Error;

    expect(schema.properties.error.required).toEqual([
      "code",
      "message",
      "hint",
      "status",
      "documentation_url",
    ]);
    expect(schema.properties.error.properties.code.enum).toEqual(
      Object.keys(API_ERROR_STATUS),
    );

    const responses = doc.paths["/"].get.responses as Record<
      string,
      { $ref?: string }
    >;
    const named = doc.components.responses as Record<
      string,
      { content: { "application/json": { schema: unknown } } }
    >;

    for (const status of ["400", "401", "403", "404", "429", "500"]) {
      expect(responses[status], `no ${status} response`).toBeDefined();
      const ref = responses[status].$ref!.replace("#/components/responses/", "");
      expect(named[ref].content["application/json"].schema).toEqual({
        $ref: "#/components/schemas/Error",
      });
    }
  });

  it("scopes every /v1 operation to a scope the authorization server issues", () => {
    const doc = document();
    const known = new Set(scopeNames());

    for (const [path, item] of Object.entries(doc.paths)) {
      if (!path.startsWith("/v1")) continue;
      for (const [method, operation] of Object.entries(
        item as Record<string, { security?: Record<string, string[]>[] }>,
      )) {
        const security = operation.security;
        expect(security, `${method} ${path} has no security`).toBeDefined();
        for (const scope of security![0].oauth2 ?? []) {
          expect(known, `${method} ${path} requires unknown ${scope}`).toContain(
            scope,
          );
        }
      }
    }
  });

  it("documents the OAuth endpoints as unauthenticated", () => {
    const doc = document();

    expect(doc.paths["/oauth/token"].post.security).toEqual([{}]);
    expect(doc.paths["/oauth/revoke"].post.security).toEqual([{}]);
  });

  it("resolves server and documentation URLs against the requesting host", () => {
    const doc = buildOpenApiDocument(
      new Request("https://www.deltalytix.app/openapi.json", {
        headers: { host: "www.deltalytix.app" },
      }),
    );

    expect(doc.servers[0].url).toBe("https://www.deltalytix.app/api");
    expect(doc.externalDocs.url).toBe("https://www.deltalytix.app/docs/api");
  });
});
