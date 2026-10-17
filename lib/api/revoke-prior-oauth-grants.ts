/**
 * When a user re-approves an OAuth app, prior grants for that user+app must
 * not remain usable alongside the new authorization code / tokens.
 *
 * Access and refresh tokens share one `OAuthAccessToken` row, so setting
 * `revokedAt` invalidates both. Unused authorization codes are marked
 * consumed so they cannot be exchanged after the new consent.
 */

export type RevokePriorOAuthGrantsDb = {
  oAuthAccessToken: {
    updateMany: (args: {
      where: {
        userId: string
        appId: string
        revokedAt: null
      }
      data: { revokedAt: Date }
    }) => Promise<{ count: number }>
  }
  oAuthAuthorizationCode: {
    updateMany: (args: {
      where: {
        userId: string
        appId: string
        consumedAt: null
      }
      data: { consumedAt: Date }
    }) => Promise<{ count: number }>
  }
}

export type RevokePriorOAuthGrantsResult = {
  revokedTokens: number
  consumedCodes: number
}

export async function revokePriorOAuthGrantsForUserApp(
  db: RevokePriorOAuthGrantsDb,
  params: { userId: string; appId: string; now?: Date },
): Promise<RevokePriorOAuthGrantsResult> {
  const now = params.now ?? new Date()
  const { userId, appId } = params

  const [tokens, codes] = await Promise.all([
    db.oAuthAccessToken.updateMany({
      where: { userId, appId, revokedAt: null },
      data: { revokedAt: now },
    }),
    db.oAuthAuthorizationCode.updateMany({
      where: { userId, appId, consumedAt: null },
      data: { consumedAt: now },
    }),
  ])

  return {
    revokedTokens: tokens.count,
    consumedCodes: codes.count,
  }
}
