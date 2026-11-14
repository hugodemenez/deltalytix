import 'server-only'

import { createClient as createSupabaseAdmin } from '@supabase/supabase-js'
import { isLocalDashboardAuthBypassEnabled } from '@/lib/local-dashboard-auth'

export const TRADE_IMAGES_BUCKET = 'trade-images'
export const TRADE_IMAGE_FOLDERS = ['trades', 'journal'] as const
const LIST_PAGE_SIZE = 100
const REMOVE_BATCH_SIZE = 100

export type StorageCleanupResult = {
  removed: number
  error?: string
}

export type StorageFileApi = {
  list: (
    path?: string,
    options?: { limit?: number; offset?: number },
  ) => Promise<{
    data: { name: string; id: string | null; metadata: unknown }[] | null
    error: { message: string } | null
  }>
  remove: (
    paths: string[],
  ) => Promise<{ error: { message: string } | null }>
}

function assertPathUnderUser(userId: string, path: string): boolean {
  return path === userId || path.startsWith(`${userId}/`)
}

/**
 * Recursively list object paths under `prefix`, paginating until empty.
 * Only returns paths that stay under `userId/`.
 * On a mid-listing failure, returns paths already discovered plus `error`.
 */
export async function listTradeImagePathsUnderUser(
  storage: StorageFileApi,
  userId: string,
  prefix: string,
): Promise<{ paths: string[]; error?: string }> {
  if (!assertPathUnderUser(userId, prefix)) {
    return {
      paths: [],
      error: `Refusing to list outside user prefix: ${prefix}`,
    }
  }

  const paths: string[] = []
  let offset = 0

  for (;;) {
    const { data, error } = await storage.list(prefix, {
      limit: LIST_PAGE_SIZE,
      offset,
    })
    if (error) {
      return { paths, error: error.message }
    }
    const entries = data ?? []
    if (entries.length === 0) break

    for (const entry of entries) {
      if (!entry.name) continue
      const child = `${prefix}/${entry.name}`
      if (!assertPathUnderUser(userId, child)) {
        return {
          paths,
          error: `Refusing path outside user prefix: ${child}`,
        }
      }
      // Folders have null id in Supabase Storage listings.
      if (entry.id === null) {
        const nested = await listTradeImagePathsUnderUser(storage, userId, child)
        paths.push(...nested.paths)
        if (nested.error) {
          return { paths, error: nested.error }
        }
      } else {
        paths.push(child)
      }
    }

    if (entries.length < LIST_PAGE_SIZE) break
    offset += entries.length
  }

  return { paths }
}

/** Remove known object paths under a user id, batching removes. */
export async function removeTradeImagePaths(
  storage: StorageFileApi,
  userId: string,
  paths: string[],
): Promise<StorageCleanupResult> {
  let removed = 0
  let firstError: string | undefined
  for (let i = 0; i < paths.length; i += REMOVE_BATCH_SIZE) {
    const batch = paths.slice(i, i + REMOVE_BATCH_SIZE)
    if (batch.some((path) => !assertPathUnderUser(userId, path))) {
      const message = `Refusing to remove paths outside ${userId}/`
      console.error('[delete-account]', message)
      firstError ??= message
      continue
    }
    const { error: removeError } = await storage.remove(batch)
    if (removeError) {
      console.error(
        '[delete-account] storage remove failed:',
        removeError.message,
      )
      firstError ??= removeError.message
      continue
    }
    removed += batch.length
  }
  return firstError ? { removed, error: firstError } : { removed }
}

/**
 * Remove screenshot and journal image objects under each user id prefix.
 * Paginates and recurses until empty. Never deletes outside `<userId>/`.
 * Continues across folders; on a listing failure still removes paths already found.
 */
export async function deleteUserTradeImageObjects(
  userIds: string[],
  storageOverride?: StorageFileApi,
): Promise<StorageCleanupResult> {
  if (userIds.length === 0) {
    return { removed: 0 }
  }
  // Injected storage is for tests; local dashboard bypass skips live Supabase only.
  if (!storageOverride && isLocalDashboardAuthBypassEnabled()) {
    return { removed: 0 }
  }

  let storage = storageOverride
  if (!storage) {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL
    const serviceKey = process.env.SUPABASE_SERVICE_KEY
    if (!url || !serviceKey) {
      const message = 'Missing Supabase credentials for storage cleanup'
      console.error('[delete-account]', message)
      return { removed: 0, error: message }
    }

    const admin = createSupabaseAdmin(url, serviceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    })
    storage = admin.storage.from(TRADE_IMAGES_BUCKET) as unknown as StorageFileApi
  }

  let removed = 0
  let firstError: string | undefined
  for (const userId of userIds) {
    for (const folder of TRADE_IMAGE_FOLDERS) {
      const prefix = `${userId}/${folder}`
      const listed = await listTradeImagePathsUnderUser(storage, userId, prefix)
      if (listed.error) {
        console.error('[delete-account] storage list failed:', prefix, listed.error)
        firstError ??= listed.error
      }
      if (listed.paths.length === 0) continue
      const removedBatch = await removeTradeImagePaths(
        storage,
        userId,
        listed.paths,
      )
      removed += removedBatch.removed
      if (removedBatch.error) {
        firstError ??= removedBatch.error
      }
    }
  }
  return firstError ? { removed, error: firstError } : { removed }
}
