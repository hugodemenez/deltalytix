import 'server-only'

import { prisma } from '@/lib/prisma'

/** Unresolved cleanup targeting this auth / former / storage id. */
export async function findUnresolvedPendingCleanupForAuthId(
  authUserId: string,
): Promise<{ id: string } | null> {
  return prisma.pendingAccountCleanup.findFirst({
    where: {
      resolvedAt: null,
      OR: [
        { authUserId },
        { formerUserId: authUserId },
        { storagePrefixes: { has: authUserId } },
      ],
    },
    select: { id: true },
  })
}
