import 'server-only'

import type { AccountDeletedStatus } from '@/lib/account-deleted-notice'
import { prisma } from '@/lib/prisma'
import { supabaseAuthUserExists } from '@/server/account-deletion/supabase-auth'

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

/**
 * Landing notice for a pending-cleanup refusal.
 * If the auth user still exists, retry cannot finish until an operator deletes
 * it — use partial_unrecorded (contact / not automatic). Otherwise partial.
 */
export async function accountDeletedStatusForPendingCleanupRefusal(
  authUserId: string,
): Promise<Extract<AccountDeletedStatus, 'partial' | 'partial_unrecorded'>> {
  if (await supabaseAuthUserExists(authUserId)) {
    return 'partial_unrecorded'
  }
  return 'partial'
}
