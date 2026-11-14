/**
 * Retry unresolved PendingAccountCleanup rows (storage + Stripe).
 *
 * Usage:
 *   bun scripts/retry-pending-account-cleanup.ts
 *   bun scripts/retry-pending-account-cleanup.ts -- --dry-run
 *   bun scripts/retry-pending-account-cleanup.ts -- --id=<cuid>
 *
 * Requires DATABASE_URL / DIRECT_URL and Supabase/Stripe credentials as for
 * normal account deletion. Prefer an admin session calling
 * POST /api/admin/pending-account-cleanup when available.
 */
import '@/lib/load-env-local.node'
import { retryPendingAccountCleanups } from '@/server/account-deletion/pending-cleanup'

const dryRun = process.argv.includes('--dry-run')
const idArg = process.argv.find((arg) => arg.startsWith('--id='))
const id = idArg?.slice('--id='.length)

async function main() {
  const results = await retryPendingAccountCleanups({ id, dryRun })
  if (results.length === 0) {
    console.log('[retry-pending-account-cleanup] no unresolved rows')
    return
  }
  for (const result of results) {
    console.log(
      `[retry-pending-account-cleanup] ${result.id}: ${
        dryRun ? 'dry-run' : result.ok ? 'resolved' : 'still pending'
      }${result.storageError ? ` storage=${result.storageError}` : ''}${
        result.stripeError ? ` stripe=${result.stripeError}` : ''
      }`,
    )
  }
}

main().catch((error) => {
  console.error('[retry-pending-account-cleanup] failed', error)
  process.exitCode = 1
})
