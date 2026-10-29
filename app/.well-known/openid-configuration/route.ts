import { connection } from "next/server";
import { NextRequest, NextResponse } from "next/server";
import { buildOAuthAuthorizationServerMetadata } from "@/lib/agent-discovery/oauth-server-metadata";

export async function GET(request: NextRequest) {
  await connection();

  return NextResponse.json({
    ...buildOAuthAuthorizationServerMetadata(request),
    // Opaque bearer tokens, not signed ID tokens: no `id_token` is ever issued,
    // so the OIDC signing-algorithm claims are deliberately absent.
    subject_types_supported: ["public"],
  });
}
